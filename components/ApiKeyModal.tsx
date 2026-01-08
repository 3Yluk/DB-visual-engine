import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { configureClient, configureModels, listVolcengineModels, saveModelConfigForMode, loadModelConfigForMode, getModeDefaultModels } from '../services/geminiService';
import { GoogleGenAI } from '@google/genai';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ApiMode = 'official' | 'custom' | 'volcengine';

interface ProviderConfig {
  id: ApiMode;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'official',
    name: 'Google Official',
    icon: <Icons.Globe size={18} />,
    color: 'orange',
    description: 'Direct connection to Google AI API'
  },
  {
    id: 'volcengine',
    name: 'Volcengine',
    icon: <Icons.Zap size={18} />,
    color: 'blue',
    description: '火山引擎 Ark Platform'
  },
  {
    id: 'custom',
    name: 'Custom Proxy',
    icon: <Icons.Server size={18} />,
    color: 'violet',
    description: 'Self-hosted or third-party proxy'
  }
];

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiMode, setApiMode] = useState<ApiMode>('custom');

  // Separate states for keys
  const [officialKey, setOfficialKey] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [volcengineKey, setVolcengineKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  // Derived current key for display/logic
  const currentKey = apiMode === 'official' ? officialKey : (apiMode === 'volcengine' ? volcengineKey : customKey);
  const setApiKey = (val: string) => {
    if (apiMode === 'official') setOfficialKey(val);
    else if (apiMode === 'volcengine') setVolcengineKey(val);
    else setCustomKey(val);
  };

  // Model Config State
  const [reasoningModel, setReasoningModel] = useState('gemini-3-pro-high');
  const [fastModel, setFastModel] = useState('gemini-3-flash');
  const [imageModel, setImageModel] = useState('gemini-3-pro-image');
  const [visionModel, setVisionModel] = useState('seed-1-6-250915');

  const [isTestLoading, setIsTestLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Volcengine model discovery
  const [availableModels, setAvailableModels] = useState<{ id: string; type: string }[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Load config when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      const storedMode = (localStorage.getItem('unimage_api_mode') || 'custom') as ApiMode;
      setApiMode(storedMode);
      loadConfigForMode(storedMode);
    }
  }, [isOpen]);

  // Load configuration for a specific mode
  const loadConfigForMode = (mode: ApiMode) => {
    // Load keys
    const legacyKey = localStorage.getItem('unimage_api_key') || '';
    setOfficialKey(localStorage.getItem('unimage_api_key_official') || (mode === 'official' ? legacyKey : ''));
    setCustomKey(localStorage.getItem('unimage_api_key_custom') || (mode === 'custom' ? legacyKey : ''));
    setVolcengineKey(localStorage.getItem('unimage_api_key_volcengine') || '');

    const storedUrl = localStorage.getItem('unimage_base_url') || 'http://127.0.0.1:8045';
    setBaseUrl(storedUrl);

    // Load models for this mode
    const modelConfig = loadModelConfigForMode(mode);
    setReasoningModel(modelConfig.reasoning);
    setFastModel(modelConfig.fast);
    setImageModel(modelConfig.image);

    const v = localStorage.getItem(`unimage_model_vision_${mode}`)
      || localStorage.getItem('unimage_model_vision')
      || 'seed-1-6-250915';
    setVisionModel(v);

    // Reset status
    setStatus('idle');
    setStatusMsg('');
  };

  // Handle provider switch
  const handleSelectProvider = (mode: ApiMode) => {
    setApiMode(mode);

    // Load defaults for this mode
    const defaults = getModeDefaultModels(mode);
    setReasoningModel(defaults.reasoning);
    setFastModel(defaults.fast);
    setImageModel(defaults.image);

    // Load existing key for this mode
    if (mode === 'official') {
      // Keep officialKey as is
    } else if (mode === 'volcengine') {
      // Keep volcengineKey as is
    } else {
      // Keep customKey as is
    }
  };

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!currentKey) {
      setStatus('error');
      setStatusMsg("API Key 不能为空");
      return;
    }
    if (apiMode === 'custom' && !baseUrl) {
      setStatus('error');
      setStatusMsg("自定义模式下 Endpoint 不能为空");
      return;
    }
    setIsTestLoading(true);
    setStatus('idle');
    try {
      if (apiMode === 'volcengine') {
        const response = await fetch("/api/volcengine-chat", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentKey}`
          },
          body: JSON.stringify({
            model: 'seed-1-6-250915',
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1
          })
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error(`认证失败 (${response.status})`);
        }
        if (response.status >= 500) {
          throw new Error(`服务器错误 (${response.status})`);
        }
        setStatus('success');
        setStatusMsg("连接成功！");
      } else {
        let client: GoogleGenAI;
        if (apiMode === 'official') {
          client = new GoogleGenAI({ apiKey: currentKey });
        } else {
          let finalUrl = baseUrl;
          if (finalUrl.endsWith('/v1')) finalUrl = finalUrl.slice(0, -3);
          else if (finalUrl.endsWith('/v1/')) finalUrl = finalUrl.slice(0, -4);
          client = new GoogleGenAI({
            apiKey: currentKey,
            httpOptions: { baseUrl: finalUrl }
          });
        }
        await client.models.generateContent({
          model: fastModel,
          contents: "Ping"
        });
        setStatus('success');
        setStatusMsg("连接成功！");
      }
    } catch (e: any) {
      console.error(e);
      setStatus('error');
      const errStr = e.message || String(e);
      if (errStr.includes("Failed to fetch") || errStr.includes("NetworkError")) {
        if (apiMode === 'custom') {
          const isHttps = window.location.protocol === 'https:';
          const isHttpTarget = baseUrl.startsWith('http:');
          if (isHttps && isHttpTarget) {
            setStatusMsg("安全策略拦截：HTTPS 页面无法访问 HTTP 接口");
          } else {
            setStatusMsg("网络错误：请检查 CORS 设置或接口地址");
          }
        } else {
          setStatusMsg("网络错误：无法连接到服务器");
        }
      } else {
        setStatusMsg(`连接失败: ${errStr}`);
      }
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleFetchModels = async () => {
    if (!volcengineKey) {
      setStatus('error');
      setStatusMsg('请先输入火山引擎 API Key');
      return;
    }
    setIsLoadingModels(true);
    setStatus('idle');
    try {
      configureClient(volcengineKey, '', 'volcengine');
      const models = await listVolcengineModels();
      setAvailableModels(models);
      if (models.length > 0) {
        setStatus('success');
        setStatusMsg(`发现 ${models.length} 个可用模型`);
      } else {
        setStatus('error');
        setStatusMsg('未找到可用模型');
      }
    } catch (e: any) {
      console.error(e);
      setStatus('error');
      setStatusMsg(`获取模型失败: ${e.message || '未知错误'}`);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSave = () => {
    if (apiMode === 'custom' && !baseUrl) return;

    localStorage.setItem('unimage_api_mode', apiMode);
    localStorage.setItem('unimage_base_url', baseUrl);
    localStorage.setItem('unimage_api_key_official', officialKey);
    localStorage.setItem('unimage_api_key_custom', customKey);
    localStorage.setItem('unimage_api_key_volcengine', volcengineKey);
    localStorage.setItem('unimage_api_key', currentKey);

    saveModelConfigForMode(apiMode, {
      reasoning: reasoningModel,
      fast: fastModel,
      image: imageModel,
      vision: visionModel
    });

    configureClient(currentKey, baseUrl, apiMode);
    configureModels({ reasoning: reasoningModel, fast: fastModel, image: imageModel });

    onClose();
  };

  const currentProvider = PROVIDERS.find(p => p.id === apiMode)!;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-stone-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-stone-700 flex max-h-[85vh]" onClick={e => e.stopPropagation()}>

        {/* Left Panel - Provider List */}
        <div className="w-56 bg-stone-950 border-r border-stone-800 flex flex-col">
          <div className="p-4 border-b border-stone-800">
            <h2 className="text-sm font-bold text-stone-300">API Providers</h2>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleSelectProvider(provider.id)}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-all text-left border-l-2 ${apiMode === provider.id
                    ? `border-${provider.color}-500 bg-stone-800/50`
                    : 'border-transparent hover:bg-stone-800/30'
                  }`}
              >
                <div className={`${apiMode === provider.id ? `text-${provider.color}-400` : 'text-stone-500'}`}>
                  {provider.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${apiMode === provider.id ? 'text-stone-200' : 'text-stone-400'}`}>
                    {provider.name}
                  </div>
                </div>
                {/* Status indicator */}
                {apiMode === provider.id && (
                  <div className={`w-2 h-2 rounded-full bg-${provider.color}-500`} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel - Configuration */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/50">
            <div className="flex items-center gap-3">
              <div className={`text-${currentProvider.color}-400`}>
                {currentProvider.icon}
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-200">{currentProvider.name}</h3>
                <p className="text-xs text-stone-500">{currentProvider.description}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-stone-500 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors">
              <Icons.X size={18} />
            </button>
          </div>

          {/* Configuration Form */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Endpoint URL (only for custom mode) */}
            {apiMode === 'custom' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Endpoint URL</label>
                <div className="relative">
                  <Icons.Link size={14} className="absolute left-3 top-3 text-stone-500" />
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8045"
                    className="w-full pl-9 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-sm font-mono text-stone-200 focus:border-violet-500 outline-none transition-all placeholder:text-stone-600"
                  />
                </div>
              </div>
            )}

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">API Key</label>
              <div className="relative">
                <Icons.Key size={14} className="absolute left-3 top-3 text-stone-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={apiMode === 'official' ? 'AIza...' : 'sk-...'}
                  className={`w-full pl-9 pr-12 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-sm font-mono text-stone-200 focus:border-${currentProvider.color}-500 outline-none transition-all placeholder:text-stone-600`}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-500 hover:text-stone-300 transition-colors"
                >
                  {showPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                </button>
              </div>
              {apiMode === 'official' && (
                <p className="text-[10px] text-stone-500">
                  从 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">Google AI Studio</a> 获取 API Key
                </p>
              )}
            </div>

            {/* Volcengine Model Discovery */}
            {apiMode === 'volcengine' && (
              <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Icons.Zap size={14} />
                    <span className="text-xs font-bold">模型发现</span>
                  </div>
                  <button
                    onClick={handleFetchModels}
                    disabled={isLoadingModels}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isLoadingModels ? <Icons.RefreshCw size={12} className="animate-spin" /> : <Icons.RefreshCw size={12} />}
                    获取模型
                  </button>
                </div>

                {availableModels.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-blue-300">图像生成</label>
                      <select
                        value={imageModel}
                        onChange={e => setImageModel(e.target.value)}
                        className="w-full px-2 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-xs font-mono text-stone-200 focus:border-blue-500 outline-none"
                      >
                        {availableModels.filter(m => m.type === 'image').map(m => (
                          <option key={m.id} value={m.id}>{m.id}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-blue-300">视觉理解</label>
                      <select
                        value={visionModel}
                        onChange={e => setVisionModel(e.target.value)}
                        className="w-full px-2 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-xs font-mono text-stone-200 focus:border-blue-500 outline-none"
                      >
                        {availableModels.filter(m => m.type === 'vision' || m.type === 'multimodal').map(m => (
                          <option key={m.id} value={m.id}>{m.id}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Model Configuration */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Icons.Cpu size={14} className="text-stone-500" />
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Models</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-500">Reasoning</label>
                  <input
                    type="text"
                    value={reasoningModel}
                    onChange={e => setReasoningModel(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs font-mono text-stone-200 focus:border-stone-600 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-500">Fast</label>
                  <input
                    type="text"
                    value={fastModel}
                    onChange={e => setFastModel(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs font-mono text-stone-200 focus:border-stone-600 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-500">Image</label>
                  <input
                    type="text"
                    value={imageModel}
                    onChange={e => setImageModel(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs font-mono text-stone-200 focus:border-stone-600 outline-none"
                  />
                </div>
                {apiMode === 'volcengine' && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500">Vision</label>
                    <input
                      type="text"
                      value={visionModel}
                      onChange={e => setVisionModel(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs font-mono text-stone-200 focus:border-stone-600 outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-stone-800 bg-stone-900/50 space-y-3">
            {status !== 'idle' && (
              <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${status === 'success' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}`}>
                {status === 'success' ? <Icons.CheckCircle2 size={12} /> : <Icons.AlertCircle size={12} />}
                {statusMsg}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleTestConnection}
                disabled={isTestLoading}
                className="flex-1 py-2.5 border border-stone-700 hover:bg-stone-800 text-stone-400 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                {isTestLoading ? <Icons.RefreshCw size={14} className="animate-spin" /> : <Icons.Activity size={14} />}
                Test Connection
              </button>
              <button
                onClick={handleSave}
                className={`flex-1 py-2.5 bg-${currentProvider.color}-600 text-white hover:bg-${currentProvider.color}-500 rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2`}
              >
                <Icons.Save size={14} />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
