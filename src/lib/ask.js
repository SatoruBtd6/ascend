// In-app confirm dialog (window.confirm is blocked in published apps)
export const AskRef = { current: (msg, fn) => fn() };
export const ask = (message, onYes, yesLabel) => AskRef.current(message, onYes, yesLabel);
