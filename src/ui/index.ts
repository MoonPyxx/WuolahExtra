export { default as CaptchaCounterDebugUI } from "./CaptchaCounterDebugUI";
export { default as CaptchaHelperUI } from "./CaptchaHelperUI";
export { default as ProgressUI } from "./ProgressUI";
export { default as DocSelectionUI } from "./DocSelectionUI";

export const addOptions = () => GM.registerMenuCommand("Config", () => GM_config.open());

