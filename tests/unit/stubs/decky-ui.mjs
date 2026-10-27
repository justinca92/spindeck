// Navigation records where the plugin tried to go.
export const navigated = [];
export const Navigation = {
  Navigate: (p) => navigated.push(p),
  NavigateBack() {},
  CloseSideMenus() {},
  NavigateToExternalWeb: (u) => navigated.push(u),
};
