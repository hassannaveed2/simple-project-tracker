import { Button } from "@/components/ui/button";
import { logout } from "@/actions/settings";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="outline">
        Log Out
      </Button>
    </form>
  );
}
