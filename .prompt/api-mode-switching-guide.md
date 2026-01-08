# API 模式切换：错误总结与预防指南

## 错误总结

### 问题现象
用户选择火山引擎模式后，生成图片时报错：
```
The model or endpoint gemini-3-pro-image does not exist
```

### 根本原因：状态同步不完整

在三种 API 模式（Official / Custom / Volcengine）切换时，存在 **三层状态** 需要同步：

| 层级 | 位置 | 切换时是否更新？ |
|------|------|-----------------|
| UI 状态 | `App.tsx` 中的 `apiMode` | ✅ 更新了 |
| 持久化存储 | `localStorage` | ✅ 更新了 |
| 服务内部状态 | `geminiService.ts` 中的 `currentConfig` 和 `modelConfig` | ❌ **未更新** |

由于第三层未更新，`geminiService.ts` 仍然使用旧模式的配置，导致错误。

---

## 具体错误点

### 1. 模式切换函数不完整
`handleSwitchApiMode()` 和 `handleSetApiMode()` 只更新了前两层：
```typescript
// 只做了这些
setApiMode(nextMode);
localStorage.setItem('berryxia_api_mode', nextMode);

// 缺少这些关键调用
configureClient(storedKey, baseUrl, nextMode);  // ← 漏了
configureModels(modeDefaults);                   // ← 漏了
```

### 2. 模型配置不区分模式
`localStorage` 中的模型名是 **全局共享** 的，没有按模式区分：
```typescript
// 问题代码
localStorage.setItem('berryxia_model_image', 'gemini-3-pro-image');  // 官方模式保存的

// 切换到火山引擎后，仍然读取这个值
const i = localStorage.getItem('berryxia_model_image');  // 返回 'gemini-3-pro-image' ← 错误！
```

### 3. 初始化时未验证模型兼容性
`initModelsFromStorage()` 直接使用存储的值，不检查是否与当前模式兼容。

---

## 解决方案

### 1. 添加集中式默认值函数
```typescript
export const getModeDefaultModels = (mode: 'official' | 'custom' | 'volcengine') => {
  switch (mode) {
    case 'volcengine':
      return { reasoning: 'seed-1-6-250915', fast: 'seed-1-6-250915', image: 'seedream-4-5-251128' };
    case 'official':
      return { reasoning: 'gemini-3-flash-preview', fast: 'gemini-3-flash-preview', image: 'gemini-3-pro-image-preview' };
    default:
      return { reasoning: 'gemini-3-pro-high', fast: 'gemini-3-flash', image: 'gemini-3-pro-image' };
  }
};
```

### 2. 模式切换时重新配置服务
```typescript
const handleSetApiMode = (targetMode) => {
  // 更新 UI 和存储
  setApiMode(targetMode);
  localStorage.setItem('berryxia_api_mode', targetMode);
  
  // 🆕 重新配置服务 - 这是关键！
  configureClient(storedKey, baseUrl, targetMode);
  configureModels(getModeDefaultModels(targetMode));
};
```

### 3. 初始化时验证模型兼容性
```typescript
const initModelsFromStorage = () => {
  const storedMode = localStorage.getItem('berryxia_api_mode');
  const defaults = getModeDefaultModels(storedMode);
  
  let imageModel = localStorage.getItem('berryxia_model_image');
  
  // 🆕 验证兼容性
  if (storedMode === 'volcengine' && imageModel?.includes('gemini')) {
    imageModel = defaults.image;  // 替换为兼容的模型
  }
  
  configureModels({ image: imageModel || defaults.image });
};
```

---

## 预防指南：多模式/多后端系统

> **核心原则：切换模式时，必须同步更新所有相关状态层**

### 检查清单

当实现多模式功能时，确保回答以下问题：

1. **状态层级完整性**
   - [ ] UI 组件状态是否更新？
   - [ ] 持久化存储（localStorage/DB）是否更新？
   - [ ] 服务层/SDK 配置是否更新？

2. **配置隔离性**
   - [ ] 不同模式的配置值是否会互相污染？
   - [ ] 切换模式后，旧模式的配置是否仍在使用？

3. **初始化兼容性**
   - [ ] 从存储加载配置时，是否验证与当前模式兼容？
   - [ ] 是否有合理的默认值回退机制？

4. **功能可用性**
   - [ ] 所有功能在每种模式下都能正常工作吗？
   - [ ] 不支持的功能是否有优雅降级或提示？

### 代码模式建议

```typescript
// ✅ 推荐：集中管理模式配置
const MODE_CONFIGS = {
  official: { endpoint: 'api.google.com', models: {...} },
  custom: { endpoint: 'user-defined', models: {...} },
  volcengine: { endpoint: 'api.volcengine.com', models: {...} }
};

// ✅ 推荐：模式切换时整体刷新
function switchMode(newMode) {
  const config = MODE_CONFIGS[newMode];
  updateUI(newMode);
  updateStorage(newMode);
  reconfigureService(config);  // ← 不要遗漏！
}

// ❌ 避免：共享配置键
localStorage.setItem('model_name', value);  // 模式间会互相覆盖

// ✅ 推荐：模式隔离的配置键
localStorage.setItem(`model_name_${mode}`, value);

// 或者：运行时验证
if (currentMode === 'volcengine' && storedModel.includes('gemini')) {
  storedModel = getDefaultModel('volcengine');
}
```

---

## 适用场景

这个指南适用于任何需要支持多种后端/模式的系统，例如：
- 多 AI 提供商切换（OpenAI / Anthropic / Google）
- 多环境切换（开发 / 测试 / 生产）
- 多租户系统
- 插件/扩展系统
