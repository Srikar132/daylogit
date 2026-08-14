import { Toast } from "@base-ui/react/toast";

const createToastManager = Toast.createToastManager;

/** One global manager, importable from anywhere (mutation callbacks, plain
 *  event handlers) — not tied to a component tree, unlike useToastManager().
 *  <Toaster /> (components/ui/toast.tsx) renders whatever's added here. */
export const toastManager = createToastManager();
