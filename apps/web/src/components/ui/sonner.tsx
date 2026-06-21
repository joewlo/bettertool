import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";

const Toaster = () => {
  return <SonnerToaster richColors />;
};

export { Toaster, sonnerToast as toast };
