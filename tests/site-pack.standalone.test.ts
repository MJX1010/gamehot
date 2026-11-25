// Site-owned changelog labels must match the reader UI's supported kinds after an engine update.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { ChangelogRelease } from "@aihot/contracts/site";

const supportedKinds: Record<ChangelogRelease["kind"], true> = { 更新: true, 优化: true, 公告: true, 下线: true };

test("every GameHot changelog entry has a kind the reader can render", () => {
  const changelog = JSON.parse(readFileSync(new URL("../site/changelog.json", import.meta.url), "utf8"));
  for (const release of changelog.releases) {
    assert.ok(Object.hasOwn(supportedKinds, release.kind), `${release.date}: unsupported changelog kind ${release.kind}`);
  }
});
