// Topic pages: which articles a topic takes, and their counts.
// Written before the code, from the ways it can go wrong:
// - a company topic takes an article about another company that only mentions it (several subjects,
//   its name nowhere in the title), or drops one about it whose title names it in English, in another
//   case, next to Chinese text, or only by a product (it is the article's only subject);
// - a Latin name matches inside another word ("Metadata" is not Meta); a headline naming a company
//   that is not a subject of the article gets in;
// - a technical-direction topic stops taking its tags;
// - withdrawn or not yet released articles appear in a list or a count;
// - an article or story page names a topic its reports do not belong to;
// - an article page cannot tell which of its tags are a topic's own, so they link to filtered lists;
// - a topic without content has no page, or an unknown slug or a page past the end has one.
import { fact, mediaSource as MEDIA, officialSource as OFFICIAL, report, story, topicTag as T } from "./topic-fixtures.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { TOPICS, loadTopicPage, listTopicSummaries, topicsOfStory } from "@aihot/backend/publication/topics";
import { buildApp } from "../apps/api/src/app.ts";

const app = await buildApp();

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at) VALUES
    (${OFFICIAL}, 'Official', 'rss', 'T1', 'editorial', '2100-01-01'),
    (${MEDIA}, 'Media', 'rss', 'T2', 'editorial', '2100-01-01')`;
});
after(async () => {
  await app.close();
  await stopBoss();
  await closeDb();
});

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);
const ids = (items: Array<{ id: string }>) => items.map((i) => i.id);
const page = async (slug: string, p = 1) => {
  const data = await loadTopicPage(slug, p, new Date());
  assert.ok(data, `${slug} page ${p}`);
  return data;
};
/** Every article of a topic, over all its pages. */
async function members(slug: string): Promise<string[]> {
  const first = await page(slug);
  const out = ids(first.items);
  for (let p = 2; p <= first.pageCount; p++) out.push(...ids((await page(slug, p)).items));
  return out;
}

test("a company topic takes the articles about it, not the ones that only mention it", async () => {
  const about = await report({ at: hoursAgo(30), title: `马力欧新作推出联机模式 ${T}`, subjects: ["nintendo"] });
  const product = await report({ at: hoursAgo(31), title: `塞尔达新版上线 ${T}`, subjects: ["nintendo"] });
  const english = await report({ at: hoursAgo(32), title: `新作发布 ${T}`, originalTitle: `Nintendo launches a game ${T}`, subjects: ["nintendo", "sony"] });
  const subpoena = await report({ at: hoursAgo(33), title: `加州检察长向 Sony 发出传票 ${T}`, subjects: ["sony", "nintendo", "tencent"] });
  const lowerCase = await report({ at: hoursAgo(34), title: `sony 公布新的账号安全框架 ${T}`, subjects: ["sony", "nintendo"] });
  const pact = await report({ at: hoursAgo(35), title: `二十余家游戏公司签署安全协议 ${T}`, subjects: ["sony", "nintendo", "netease"] });
  const metadata = await report({ at: hoursAgo(36), title: `Epicenter 标准发布，Sony 参与 ${T}`, subjects: ["epic", "sony"] });
  const adjacent = await report({ at: hoursAgo(37), title: `发布Epic的新游戏 ${T}`, subjects: ["epic", "sony"] });
  const headline = await report({ at: hoursAgo(38), title: `Nintendo 被一篇盘点提到 ${T}`, subjects: ["netease"] });
  const agent = await report({ at: hoursAgo(39), title: `独立游戏发售 ${T}`, tags: ["独立游戏"] });

  const anthropic = await members("nintendo");
  for (const id of [about, product, english]) assert.ok(anthropic.includes(id), "about Anthropic");
  for (const id of [subpoena, lowerCase, pact, headline]) assert.ok(!anthropic.includes(id), "only mentions Anthropic");
  const openai = await members("sony");
  for (const id of [subpoena, lowerCase, metadata]) assert.ok(openai.includes(id), "about OpenAI");
  for (const id of [english, pact]) assert.ok(!openai.includes(id), "only mentions OpenAI");
  const meta = await members("epic");
  assert.ok(meta.includes(adjacent), "Meta next to Chinese text");
  assert.ok(!meta.includes(metadata), "Epicenter is not Epic");
  assert.ok((await members("indie")).includes(agent), "a technical direction takes its tag");

  // The article page names the topics it belongs to.
  const topicsOf = async (id: string) => {
    const res = await app.inject({ method: "GET", url: `/api/site/items/${id}` });
    return (JSON.parse(res.body) as { topics: Array<{ slug: string }> }).topics.map((t) => t.slug);
  };
  assert.deepEqual(await topicsOf(about), ["nintendo", "releases"]);
  assert.deepEqual(await topicsOf(subpoena), ["sony", "releases"]);
  assert.deepEqual(await topicsOf(pact), ["releases"]);
  assert.deepEqual(await topicsOf(agent), ["indie", "releases"]);
});

test("renaming a company topic keeps its old full name usable for search", async () => {
  const id = await report({at: hoursAgo(2), title: `米哈游 新作上线 ${T}`, subjects: ['mihoyo'], selected: false});
  for (const query of ['米哈游 / HoYoverse', 'miHoYo / HoYoverse']) {
    const res = await app.inject({method: 'GET', url: `/api/site/pool?q=${encodeURIComponent(query)}`});
    assert.equal(res.statusCode, 200);
    assert.ok(ids(JSON.parse(res.body).items).includes(id), 'full company names must still find subject-tagged reports');
  }
});

test("a story page names the topics of its reports", async () => {
  const launch = await story(`独立游戏 V2 发布 ${T}`);
  await report({ source: OFFICIAL, at: hoursAgo(26), title: `独立游戏 V2 发布 ${T}`, tags: ["独立游戏"], fact: await fact(launch.id, "发布 V2") });
  assert.deepEqual(await topicsOfStory(launch.id), [{ slug: "indie", name: "独立游戏" }, { slug: "releases", name: "发行与更新" }]);
});

test("withdrawn articles stay out of lists and counts", async () => {
  const kept = await report({ at: hoursAgo(5), title: `米哈游 发布新作 ${T}`, subjects: ["mihoyo"] });
  const withdrawn = await report({ at: hoursAgo(4), title: `米哈游 撤回的消息 ${T}`, subjects: ["mihoyo"] });
  await sql`UPDATE publications SET visibility = 'withdrawn' WHERE article_id = ${withdrawn}`;

  const data = await page("mihoyo");
  assert.deepEqual(ids(data.items), [kept]);
  assert.equal(data.topic.total, 1);
  const summary = (await listTopicSummaries()).topics.find((t) => t.slug === "mihoyo")!;
  assert.equal(summary.latest?.title, `米哈游 发布新作 ${T}`, "the index shows the newest public article");
});

test("every topic has a page; unknown topics and pages past the end have none", async () => {
  const empty = await page("riot");
  assert.equal(empty.topic.indexable, false, "a topic without content is not indexed");
  assert.deepEqual(empty.items, []);
  assert.equal(await loadTopicPage("not-a-topic", 1, new Date()), null);
  assert.equal(await loadTopicPage("riot", 2, new Date()), null);
  const index = await app.inject({ method: "GET", url: "/api/site/topics" });
  const body = JSON.parse(index.body) as { groups: Array<{ key: string }>; topics: Array<{ slug: string }> };
  assert.deepEqual(body.groups.map((g) => g.key), ["company", "field", "genre"]);
  assert.deepEqual(body.topics.map((t) => t.slug).sort(), TOPICS.map((t) => t.slug).sort(), "the index lists every topic");
});

test("an article page says which of its tags are a topic's own", async () => {
  // A direction's or a form's tags, and the tag cards show for a company (its subject tag is never shown).
  const id = await report({ at: hoursAgo(3), title: `Nintendo 开源智能体框架 ${T}`, subjects: ["nintendo", "sony"], tags: ["独立游戏", "渲染", "Nintendo", "Sony", "框架"] });
  const res = await app.inject({ method: "GET", url: `/api/site/items/${id}` });
  const body = JSON.parse(res.body) as { tags: string[]; tagTopics: Record<string, string>; topics: Array<{ slug: string }> };
  assert.deepEqual(body.tags, ["游戏发行", "独立游戏", "渲染", "Nintendo", "Sony", "框架"]);
  assert.deepEqual(body.tagTopics, { "游戏发行": "releases", 独立游戏: "indie", "渲染": "tech-art", Nintendo: "nintendo", Sony: "sony" });
  // The company its title does not name is a topic of the tag, not of the article.
  assert.deepEqual(body.topics.map((t) => t.slug), ["nintendo", "indie", "tech-art", "releases"]);
});
