import type { Metadata } from "next";
import { AccountDashboard } from "@/components/account/account-dashboard";

/**
 * The customer's own appointments.
 *
 * A thin server component. Everything below it is a client component, because
 * everything below it depends on who is signed in, and under `output: "export"`
 * that can only be known in the browser.
 *
 * noindex: this page renders nothing for a crawler, and a "log in to see your
 * appointments" screen is not a search result anyone wants.
 */
export const metadata: Metadata = {
  title: "My appointments",
  description: "Your upcoming and past appointments with Crowned by Nat.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountDashboard />;
}
