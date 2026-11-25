// GameHot 行业词表；中文版保持不变，供英文接口与未来英文站使用。
import type { CATEGORIES } from "./taxonomy.ts";
type CategoryKey = (typeof CATEGORIES)[number]["key"];

export const CATEGORY_EN: Record<CategoryKey, { label: string; feedLabel: string; section: string }> = {
  "releases": {
    "label": "Releases",
    "feedLabel": "Game Releases",
    "section": "Releases & updates"
  },
  "industry": {
    "label": "Industry",
    "feedLabel": "Game Industry",
    "section": "Industry news"
  },
  "esports": {
    "label": "Esports",
    "feedLabel": "Esports & Community",
    "section": "Esports & community"
  },
  "tools-engines": {
    "label": "Engines & Tools",
    "feedLabel": "Engines & Tools",
    "section": "Engines & tools"
  },
  "studios": {
    "label": "Studios",
    "feedLabel": "Studios & Business",
    "section": "Studios & business"
  },
  "tech-art": {
    "label": "Tech & Art",
    "feedLabel": "Technology & Opinion",
    "section": "Technology & opinion"
  }
};

export const TAG_EN: Record<string, string> = {
  "游戏发行": "Game releases",
  "产品更新": "Product updates",
  "工具引擎": "Engines & tools",
  "技术文章": "Technical articles",
  "教程实践": "Tutorials",
  "大佬观点": "Opinion",
  "评测导购": "Reviews & buying guides",
  "电竞社区": "Esports & community",
  "行业动态": "Industry news",
  "政策监管": "Policy & regulation",
  "非游戏": "Non-gaming",
  "其他": "Other",
  "主机": "Consoles",
  "移动": "Mobile",
  "独立游戏": "Indie games",
  "网游/MMO": "Online games & MMO",
  "网游": "Online games",
  "射击": "Shooters",
  "开放世界": "Open world",
  "电竞": "Esports",
  "云游戏": "Cloud gaming",
  "引擎": "Engines",
  "渲染": "Rendering",
  "多人联机": "Multiplayer",
  "工具链": "Toolchains",
  "发行/渠道": "Publishing & distribution",
  "发行渠道": "Publishing & distribution",
  "AI 玩法": "AI gameplay"
};

export const TOPIC_EN: Record<string, { name: string; definition: string }> = {
  "nintendo": {
    "name": "Nintendo",
    "definition": "Nintendo consoles, first-party games, Switch and company strategy."
  },
  "sony": {
    "name": "Sony / PlayStation",
    "definition": "PlayStation platforms, first-party studios and Sony Interactive Entertainment."
  },
  "microsoft": {
    "name": "Microsoft / Xbox",
    "definition": "Xbox, Game Pass and Microsoft studios, including Activision, Blizzard and Bethesda."
  },
  "valve": {
    "name": "Valve / Steam",
    "definition": "Steam policies, Steam Deck, Valve games and the store ecosystem."
  },
  "epic": {
    "name": "Epic Games",
    "definition": "Epic Games Store, Fortnite, Unreal Engine and the developer ecosystem."
  },
  "unity": {
    "name": "Unity",
    "definition": "Unity engine versions, pricing, editor features and services."
  },
  "tencent": {
    "name": "Tencent Games",
    "definition": "Tencent publishing, investments and game studios."
  },
  "netease": {
    "name": "NetEase Games",
    "definition": "NetEase game development, publishing and overseas studios."
  },
  "mihoyo": {
    "name": "miHoYo / HoYoverse",
    "definition": "miHoYo and HoYoverse games, updates and company news."
  },
  "riot": {
    "name": "Riot Games",
    "definition": "League of Legends, Valorant and the Riot esports ecosystem."
  },
  "tools-engines": {
    "name": "Engines & Tools",
    "definition": "Game engines, middleware, editors and production pipelines."
  },
  "unreal": {
    "name": "Unreal Engine",
    "definition": "Unreal Engine releases, features and learning resources."
  },
  "indie": {
    "name": "Indie Games",
    "definition": "Indie releases, funding, events and development experience."
  },
  "pc-gaming": {
    "name": "PC Gaming",
    "definition": "PC game releases, hardware and stores."
  },
  "mobile": {
    "name": "Mobile Games",
    "definition": "Mobile releases, platform policies, LiveOps and market data."
  },
  "esports": {
    "name": "Esports",
    "definition": "Competitions, teams, players and related game updates."
  },
  "tech-art": {
    "name": "Technology & Art",
    "definition": "Rendering, gameplay systems, networking and art pipelines."
  },
  "releases": {
    "name": "Releases & Updates",
    "definition": "New game releases, major updates and important patches."
  },
  "studios-business": {
    "name": "Studios & Business",
    "definition": "Funding, acquisitions, people, publishing deals and financial results."
  },
  "reviews": {
    "name": "Reviews & Buying Guides",
    "definition": "In-depth reviews, comparisons and buying decisions."
  },
  "opinion": {
    "name": "Opinion & Postmortems",
    "definition": "Industry commentary, developer interviews and project postmortems."
  },
  "community": {
    "name": "Community & Mods",
    "definition": "Player communities, modding and creator culture."
  },
  "policy": {
    "name": "Policy & Regulation",
    "definition": "Game approvals, ratings, store policies and regulation."
  },
  "gdc": {
    "name": "GDC & Conferences",
    "definition": "Game industry conference talks, news and notes."
  }
};

export const TOPIC_GROUP_EN: Record<string, { name: string; blurb: string }> = {
  "company": {
    "name": "Companies & Platforms",
    "blurb": "Follow game companies, releases and platform policies"
  },
  "field": {
    "name": "Fields & Genres",
    "blurb": "Explore engines, indie games, esports and development"
  },
  "genre": {
    "name": "Content Types",
    "blurb": "Browse releases, technical articles, opinion and business news"
  }
};

export const RELEASE_UNIT_EN = { one: "new game", many: "new games" };
