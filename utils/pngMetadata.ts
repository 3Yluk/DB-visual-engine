/**
 * PNG Metadata Utilities
 * 
 * Embeds and extracts prompts from PNG images using tEXt chunks.
 * Uses Stable Diffusion compatible format for Eagle plugin compatibility.
 */

// PNG signature bytes
const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

// CRC32 lookup table
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC_TABLE[n] = c;
}

function crc32(data: Uint8Array): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function base64ToUint8Array(base64: string): Uint8Array {
    // Handle data URL format
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Create a PNG tEXt chunk
 * Format: keyword (1-79 bytes) + null separator + text
 */
function createTextChunk(keyword: string, text: string): Uint8Array {
    const keywordBytes = new TextEncoder().encode(keyword);
    const textBytes = new TextEncoder().encode(text);

    // Chunk data = keyword + null byte + text
    const chunkData = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
    chunkData.set(keywordBytes, 0);
    chunkData[keywordBytes.length] = 0; // null separator
    chunkData.set(textBytes, keywordBytes.length + 1);

    // Chunk type "tEXt"
    const chunkType = new Uint8Array([0x74, 0x45, 0x58, 0x74]); // tEXt

    // Calculate CRC over type + data
    const crcData = new Uint8Array(chunkType.length + chunkData.length);
    crcData.set(chunkType, 0);
    crcData.set(chunkData, chunkType.length);
    const crc = crc32(crcData);

    // Build complete chunk: length (4) + type (4) + data + crc (4)
    const chunk = new Uint8Array(4 + 4 + chunkData.length + 4);

    // Length (big-endian)
    const length = chunkData.length;
    chunk[0] = (length >>> 24) & 0xFF;
    chunk[1] = (length >>> 16) & 0xFF;
    chunk[2] = (length >>> 8) & 0xFF;
    chunk[3] = length & 0xFF;

    // Type
    chunk.set(chunkType, 4);

    // Data
    chunk.set(chunkData, 8);

    // CRC (big-endian)
    chunk[8 + chunkData.length] = (crc >>> 24) & 0xFF;
    chunk[8 + chunkData.length + 1] = (crc >>> 16) & 0xFF;
    chunk[8 + chunkData.length + 2] = (crc >>> 8) & 0xFF;
    chunk[8 + chunkData.length + 3] = crc & 0xFF;

    return chunk;
}

/**
 * Find the position after IHDR chunk (first chunk after signature)
 */
function findInsertPosition(data: Uint8Array): number {
    // Skip PNG signature (8 bytes)
    let pos = 8;

    // Read first chunk (should be IHDR)
    const length = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3];
    // Skip: length(4) + type(4) + data(length) + crc(4)
    pos += 4 + 4 + length + 4;

    return pos;
}

/**
 * Embed a prompt into a PNG image as tEXt metadata
 * Embeds into multiple keys for maximum compatibility:
 * - parameters (Stable Diffusion standard)
 * - Description (General)
 * - Comment (General)
 * - Software (To indicate source)
 */
export function embedPromptInPng(base64: string, prompt: string): string {
    try {
        const data = base64ToUint8Array(base64);

        // Verify PNG signature
        for (let i = 0; i < 8; i++) {
            if (data[i] !== PNG_SIGNATURE[i]) {
                console.warn('Not a valid PNG file, returning original');
                return base64.includes(',') ? base64.split(',')[1] : base64;
            }
        }

        // Prepare chunks to insert
        const chunksToInsert = [
            createTextChunk('parameters', prompt), // SD WebUI / Eagle Prompt Inspector
            createTextChunk('Description', prompt), // Windows / MacOS Finder
            createTextChunk('Comment', prompt),     // General
            createTextChunk('Software', 'DB Visual Engine')
        ];

        // Find insertion point (after IHDR)
        const insertPos = findInsertPosition(data);

        // Calculate total new size
        let totalChunkSize = 0;
        chunksToInsert.forEach(c => totalChunkSize += c.length);

        const newData = new Uint8Array(data.length + totalChunkSize);

        // Copy header (Signature + IHDR)
        newData.set(data.slice(0, insertPos), 0);

        // Insert new chunks
        let currentPos = insertPos;
        chunksToInsert.forEach(chunk => {
            newData.set(chunk, currentPos);
            currentPos += chunk.length;
        });

        // Copy rest of the file
        newData.set(data.slice(insertPos), currentPos);

        return uint8ArrayToBase64(newData);
    } catch (error) {
        console.error('Failed to embed prompt in PNG:', error);
        return base64.includes(',') ? base64.split(',')[1] : base64;
    }
}

/**
 * Extract prompt from a PNG image's tEXt metadata
 */
export function extractPromptFromPng(base64: string): string | null {
    try {
        const data = base64ToUint8Array(base64);

        // Verify PNG signature
        for (let i = 0; i < 8; i++) {
            if (data[i] !== PNG_SIGNATURE[i]) return null;
        }

        // Parse chunks
        let pos = 8; // Skip signature

        while (pos < data.length - 12) { // Minimum chunk size is 12 bytes
            // Read length
            const length = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3];
            pos += 4;

            // Read type
            const type = String.fromCharCode(data[pos], data[pos + 1], data[pos + 2], data[pos + 3]);
            pos += 4;

            // Check if this is a tEXt chunk
            if (type === 'tEXt') {
                // Find null separator to split keyword and text
                let nullPos = pos;
                while (nullPos < pos + length && data[nullPos] !== 0) {
                    nullPos++;
                }

                const keyword = new TextDecoder().decode(data.slice(pos, nullPos));
                const text = new TextDecoder().decode(data.slice(nullPos + 1, pos + length));

                // Check for SD-compatible keywords or general ones
                if (keyword === 'parameters' || keyword === 'prompt' || keyword === 'Description' || keyword === 'Comment') {
                    return text;
                }
            }

            // Skip to next chunk (data + crc)
            pos += length + 4;

            // Stop at IEND
            if (type === 'IEND') break;
        }

        return null;
    } catch (error) {
        console.error('Failed to extract prompt from PNG:', error);
        return null;
    }
}
