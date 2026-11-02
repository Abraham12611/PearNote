import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GroupsDesk } from "../src/pearnotes/shell/app/GroupsDesk";
import { ProfileDesk } from "../src/pearnotes/shell/app/ProfileDesk";
import { SettingsDesk } from "../src/pearnotes/shell/app/SettingsDesk";

describe("Groups/Profile/Settings desks — honest non-live states", () => {
  it("groups never mounts a personal rooms read and stays honest", () => {
    const html = renderToStaticMarkup(
      <GroupsDesk learnerName="ana" onOpenSpace={() => {}} onOpenSpaces={() => {}} />,
    );
    expect(html).toContain("data-testid=\"groups-desk\"");
    expect(html).not.toContain("groups-mine"); // no spaces.listMine without live
    expect(html).toContain("open shared spaces");
    expect(html).toContain("not built yet");
  });

  it("profile stays a signed-in affordance without live reads (no hooks)", () => {
    const html = renderToStaticMarkup(<ProfileDesk learnerName="ana" />);
    expect(html).toContain("data-testid=\"profile-desk\"");
    expect(html).toContain("profiles live on a signed-in account");
    expect(html).not.toContain("persona-"); // no persona editor without a real query
  });

  it("settings shows only honest states when there is no session", () => {
    const html = renderToStaticMarkup(
      <SettingsDesk learnerName="ana" onOpenProfile={() => {}} />,
    );
    expect(html).toContain("data-testid=\"settings-desk\"");
    expect(html).toContain("account settings need a session");
    expect(html).not.toContain("set-signout"); // no fake sign-out button
    expect(html).not.toContain("toggle"); // no pretend switches
  });
});
