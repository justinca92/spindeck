// Minimal typings for Decky's runtime libraries (offline typechecking only).
declare module "@decky/ui" {
  type C<P = {}> = (p: P & { [k: string]: any }) => any;
  export const ButtonItem: C, DialogButton: C, Focusable: C, ModalRoot: C, PanelSection: C, PanelSectionRow: C;
  export const TextField: C<{ onChange?: (e: { target: HTMLInputElement }) => void }>;
  export const ToggleField: C<{ onChange?: (v: boolean) => void }>;
  export const SliderField: C<{ onChange?: (v: number) => void }>;
  export const DropdownItem: C<{ onChange?: (o: { data: any; label: any }) => void }>;
  export const Navigation: { Navigate(p: string): void; NavigateBack(): void; CloseSideMenus(): void; NavigateToExternalWeb(url: string): void };
  export const staticClasses: any;
  export function showContextMenu(el: any, anchor?: any, opts?: any): void;
  export function showModal(el: any): any;
  export enum GamepadButton {
    INVALID, OK, CANCEL, SECONDARY, OPTIONS, BUMPER_LEFT, BUMPER_RIGHT, TRIGGER_LEFT, TRIGGER_RIGHT,
    DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT, SELECT, START, LSTICK_CLICK, RSTICK_CLICK, LSTICK_TOUCH,
    RSTICK_TOUCH, LPAD_TOUCH, LPAD_CLICK, RPAD_TOUCH, RPAD_CLICK, REAR_LEFT_UPPER, REAR_LEFT_LOWER,
    REAR_RIGHT_UPPER, REAR_RIGHT_LOWER, STEAM_GUIDE, STEAM_QUICK_MENU,
  }
  export interface GamepadEvent extends CustomEvent {
    detail: { button: GamepadButton; is_repeat?: boolean; source?: number };
  }
}
declare module "@decky/api" {
  export function callable<A extends any[], R>(name: string): (...a: A) => Promise<R>;
  export function definePlugin(fn: () => any): any;
  export const routerHook: any;
}
