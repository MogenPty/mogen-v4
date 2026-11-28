import type { ReactNode } from "react";
import EnquiryPopupHost from "@/components/mogen/enquiry-popup-host";

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      {children}
      <EnquiryPopupHost />
    </>
  );
}
