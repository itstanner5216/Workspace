var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-lRWrxK/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/lib/sources/google.js
var GoogleProvider = class {
  static {
    __name(this, "GoogleProvider");
  }
  constructor() {
    this.name = "Google";
    this.baseUrl = "https://www.googleapis.com/customsearch/v1";
    this.dailyCap = 100;
    this.monthlyCap = 3e3;
    this.ttl = 24 * 60 * 60;
    this.batchSize = 10;
  }
  async search(query, options, env) {
    const apiKey = env.GOOGLE_API_KEY;
    const cseId = env.GOOGLE_CSE_ID;
    if (!apiKey || !cseId) {
      console.warn("Google API key or CSE ID not configured");
      return [];
    }
    const ledger = options.ledger;
    if (ledger) {
      const state = ledger.getProviderState("google");
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded("google", this.getNextDailyReset());
        throw new Error("QUOTA_EXCEEDED_DAILY");
      }
    }
    try {
      const params = new URLSearchParams({
        key: apiKey,
        cx: cseId,
        q: query,
        num: Math.min(options.limit || 10, this.batchSize),
        safe: options.safeMode ? "active" : "off"
      });
      if (options.fresh && options.fresh !== "all") {
        const days = options.fresh.replace("d", "");
        if (days && !isNaN(days)) {
          params.set("dateRestrict", `d${days}`);
        }
      }
      if (options.site) {
        params.set("siteSearch", options.site);
      }
      const response = await fetch(`${this.baseUrl}?${params}`);
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded("google", this.getNextDailyReset());
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(`Google API error: ${data.error?.message || response.status}`);
      }
      if (ledger) {
        ledger.recordSuccess("google");
        ledger.incrementDailyUsed("google");
      }
      return this.normalizeResults(data.items || [], options);
    } catch (error) {
      if (ledger) {
        if (error.message.includes("QUOTA")) {
          ledger.markQuotaExceeded("google", this.getNextDailyReset());
        } else {
          ledger.recordError("google", "5xx");
        }
      }
      throw error;
    }
  }
  normalizeResults(results, options) {
    return results.map((item) => ({
      title: item.title || "No title",
      url: item.link || "#",
      snippet: item.snippet || "",
      published_at: null,
      author: null,
      thumbnail: item.pagemap?.cse_image?.[0]?.src || null,
      score: 1,
      extra: {
        provider: "google",
        displayLink: item.displayLink
      }
    }));
  }
  getNextDailyReset() {
    const now2 = /* @__PURE__ */ new Date();
    const nextReset = new Date(now2);
    nextReset.setUTCHours(4, 0, 0, 0);
    if (nextReset <= now2) {
      nextReset.setDate(nextReset.getDate() + 1);
    }
    return nextReset.toISOString();
  }
};

// src/lib/sources/serpapi.js
var SerpApiProvider = class {
  static {
    __name(this, "SerpApiProvider");
  }
  constructor() {
    this.name = "SerpApi";
    this.baseUrl = "https://serpapi.com/search";
    this.version = "1.0.0";
    this.dailyCap = 100;
    this.monthlyCap = 3e3;
    this.ttl = 24 * 60 * 60;
    this.batchSize = 10;
  }
  async search(query, options, env) {
    const apiKey = env.SERPAPI_KEY;
    if (!apiKey) {
      console.warn("SerpApi API key not configured");
      return [];
    }
    const ledger = options.ledger;
    if (ledger) {
      const state = ledger.getProviderState("serpapi");
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded("serpapi", this.getNextDailyReset());
        throw new Error("QUOTA_EXCEEDED_DAILY");
      }
    }
    try {
      const params = new URLSearchParams({
        q: query,
        api_key: apiKey,
        engine: "google",
        num: Math.min(options.limit || 10, this.batchSize),
        start: 0
      });
      if (options.fresh && options.fresh !== "all") {
        const days = options.fresh.replace("d", "");
        params.append("tbs", `qdr:d${days}`);
      }
      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          "User-Agent": "Jack-Portal/2.0.0"
        },
        cf: { timeout: 1e4 }
      });
      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded("serpapi", this.getNextDailyReset());
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(`SerpApi error: ${response.status}`);
      }
      const data = await response.json();
      if (ledger) {
        ledger.recordSuccess("serpapi");
        ledger.incrementDailyUsed("serpapi");
      }
      return this.normalizeResults(data.organic_results || [], options);
    } catch (error) {
      if (ledger) {
        if (error.message.includes("QUOTA")) {
          ledger.markQuotaExceeded("serpapi", this.getNextDailyReset());
        } else {
          ledger.recordError("serpapi", "5xx");
        }
      }
      throw error;
    }
  }
  normalizeResults(results, options) {
    return results.map((item) => ({
      title: item.title || "No title",
      url: item.link || "#",
      snippet: item.snippet || "",
      published_at: item.date || null,
      author: item.displayed_link || null,
      thumbnail: item.thumbnail?.src || null,
      score: 0.8,
      extra: {
        provider: "serpapi",
        position: item.position,
        displayed_link: item.displayed_link,
        cached_page_link: item.cached_page_link
      }
    }));
  }
  getNextDailyReset() {
    const now2 = /* @__PURE__ */ new Date();
    const nextReset = new Date(now2);
    nextReset.setUTCHours(4, 0, 0, 0);
    if (nextReset <= now2) {
      nextReset.setDate(nextReset.getDate() + 1);
    }
    return nextReset.toISOString();
  }
};

// src/lib/sources/serper.js
var SerperProvider = class {
  static {
    __name(this, "SerperProvider");
  }
  constructor() {
    this.name = "Serper";
    this.baseUrl = "https://google.serper.dev/search";
    this.dailyCap = 83;
    this.monthlyCap = 2500;
    this.ttl = 24 * 60 * 60;
    this.batchSize = 10;
  }
  async search(query, options, env) {
    const apiKey = env.SERPER_KEY;
    if (!apiKey) {
      console.warn("Serper API key not configured");
      return [];
    }
    const ledger = options.ledger;
    if (ledger) {
      const state = ledger.getProviderState("serper");
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded("serper", this.getNextDailyReset());
        throw new Error("QUOTA_EXCEEDED_DAILY");
      }
    }
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey
        },
        body: JSON.stringify({
          q: query,
          num: Math.min(options.limit || 10, this.batchSize)
        })
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded("serper", this.getNextDailyReset());
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(`Serper API error: ${response.status}`);
      }
      if (ledger) {
        ledger.recordSuccess("serper");
        ledger.incrementDailyUsed("serper");
      }
      return (data.organic || []).map((item) => ({
        title: item.title || "No title",
        url: item.link || "#",
        snippet: item.snippet || "",
        score: 0.5,
        thumbnail: item.thumbnail || null,
        published_at: item.date || null,
        author: item.displayed_link || null,
        extra: {
          provider: "serper",
          position: item.position,
          domain: item.displayed_link
        }
      }));
    } catch (error) {
      if (ledger) {
        if (error.message.includes("QUOTA")) {
          ledger.markQuotaExceeded("serper", this.getNextDailyReset());
        } else {
          ledger.recordError("serper", "5xx");
        }
      }
      throw error;
    }
  }
  getNextDailyReset() {
    const now2 = /* @__PURE__ */ new Date();
    const nextReset = new Date(now2);
    nextReset.setUTCHours(4, 0, 0, 0);
    if (nextReset <= now2) {
      nextReset.setDate(nextReset.getDate() + 1);
    }
    return nextReset.toISOString();
  }
};

// src/lib/sources/yandex.js
var YandexProvider = class {
  static {
    __name(this, "YandexProvider");
  }
  constructor() {
    this.name = "Yandex";
    this.baseUrl = "https://api.serpwow.com/search";
    this.dailyCap = 3;
    this.monthlyCap = 100;
    this.ttl = 4 * 24 * 60 * 60;
    this.batchSize = 50;
  }
  async search(query, options, env) {
    const apiKey = env.SERPWOW_API_KEY;
    if (!apiKey) {
      console.warn("SERP Wow (Yandex) API key not configured");
      return [];
    }
    const ledger = options.ledger;
    if (ledger) {
      const state = ledger.getProviderState("yandex");
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded("yandex", this.getNextDailyReset());
        throw new Error("QUOTA_EXCEEDED_DAILY");
      }
    }
    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        q: query,
        engine: "yandex",
        num: Math.min(options.limit || 10, this.batchSize),
        yandex_domain: options.yandex_domain || "yandex.com",
        yandex_location: options.yandex_location || "",
        yandex_language: options.yandex_language || "en"
      });
      if (options.fresh && options.fresh !== "all") {
        const days = options.fresh.replace("d", "");
        params.append("tbs", `qdr:d${days}`);
      }
      const response = await fetch(`${this.baseUrl}?${params}`);
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded("yandex", this.getNextDailyReset());
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(`SERP Wow error: ${data.error || response.status}`);
      }
      if (ledger) {
        ledger.recordSuccess("yandex");
        ledger.incrementDailyUsed("yandex");
      }
      return this.normalizeResults(data.organic_results || [], options);
    } catch (error) {
      if (ledger) {
        if (error.message.includes("QUOTA")) {
          ledger.markQuotaExceeded("yandex", this.getNextDailyReset());
        } else {
          ledger.recordError("yandex", "5xx");
        }
      }
      throw error;
    }
  }
  normalizeResults(results, options) {
    return results.map((item) => ({
      title: item.title || "No title",
      url: item.link || "#",
      snippet: item.snippet || "",
      published_at: item.date || null,
      author: item.displayed_link || null,
      thumbnail: item.thumbnail?.src || null,
      score: 0.9,
      extra: {
        provider: "yandex",
        position: item.position,
        domain: item.domain
      }
    }));
  }
  getNextDailyReset() {
    const now2 = /* @__PURE__ */ new Date();
    const nextReset = new Date(now2);
    nextReset.setUTCHours(4, 0, 0, 0);
    if (nextReset <= now2) {
      nextReset.setDate(nextReset.getDate() + 1);
    }
    return nextReset.toISOString();
  }
};

// src/lib/sources/brave.js
var BraveProvider = class {
  static {
    __name(this, "BraveProvider");
  }
  constructor() {
    this.name = "Brave";
    this.baseUrl = "https://api.search.brave.com/res/v1/web/search";
    this.dailyCap = 66;
    this.monthlyCap = 2e3;
    this.ttl = 24 * 60 * 60;
    this.batchSize = 20;
  }
  async search(query, options, env) {
    const apiKey = env.BRAVE_API_KEY;
    if (!apiKey) {
      console.warn("Brave API key not configured");
      return [];
    }
    const ledger = options.ledger;
    if (ledger) {
      const state = ledger.getProviderState("brave");
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded("brave", this.getNextDailyReset());
        throw new Error("QUOTA_EXCEEDED_DAILY");
      }
    }
    try {
      const params = new URLSearchParams({
        q: query,
        count: Math.min(options.limit || 10, this.batchSize),
        safesearch: options.safeMode ? "strict" : "off"
      });
      if (options.fresh && options.fresh !== "all") {
        if (options.fresh === "d1") params.set("freshness", "pd");
        else if (options.fresh === "d7") params.set("freshness", "pw");
        else if (options.fresh === "d30") params.set("freshness", "pm");
        else if (options.fresh === "d365") params.set("freshness", "py");
      }
      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": apiKey
        }
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded("brave", this.getNextDailyReset());
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(`Brave API error: ${response.status}`);
      }
      if (ledger) {
        ledger.recordSuccess("brave");
        ledger.incrementDailyUsed("brave");
      }
      return (data.web?.results || []).map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.description,
        score: result.score || 1,
        thumbnail: result.thumbnail?.src || null,
        published_at: null,
        author: result.meta_url?.hostname || null,
        extra: {
          provider: "brave",
          subtype: result.subtype,
          age: result.page_age
        }
      }));
    } catch (error) {
      if (ledger) {
        if (error.message.includes("QUOTA")) {
          ledger.markQuotaExceeded("brave", this.getNextDailyReset());
        } else {
          ledger.recordError("brave", "5xx");
        }
      }
      throw error;
    }
  }
  getNextDailyReset() {
    const now2 = /* @__PURE__ */ new Date();
    const nextReset = new Date(now2);
    nextReset.setUTCHours(4, 0, 0, 0);
    if (nextReset <= now2) {
      nextReset.setDate(nextReset.getDate() + 1);
    }
    return nextReset.toISOString();
  }
};

// src/lib/sources/serphouse.js
var SerpHouseProvider = class {
  static {
    __name(this, "SerpHouseProvider");
  }
  constructor() {
    this.name = "SerpHouse";
    this.baseUrl = "https://api.serphouse.com/serp";
    this.version = "1.0.0";
    this.dailyCap = 13;
    this.monthlyCap = 400;
    this.ttl = 4 * 24 * 60 * 60;
    this.batchSize = 75;
  }
  async search(query, options, env) {
    const apiKey = env.SERPHOUSE_KEY;
    if (!apiKey) {
      console.warn("SerpHouse API key not configured");
      return [];
    }
    const ledger = options.ledger;
    if (ledger) {
      const state = ledger.getProviderState("serphouse");
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded("serphouse", this.getNextDailyReset());
        throw new Error("QUOTA_EXCEEDED_DAILY");
      }
    }
    try {
      const params = {
        q: query,
        num: Math.min(options.limit || 10, this.batchSize),
        domain: "google.com",
        lang: "en",
        device: "desktop",
        serp_type: "web"
      };
      if (options.fresh && options.fresh !== "all") {
        const days = options.fresh.replace("d", "");
        params.time_period = `past_${days}_days`;
      }
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "User-Agent": "Jack-Portal/2.0.0"
        },
        body: JSON.stringify(params),
        cf: { timeout: 15e3 }
      });
      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded("serphouse", this.getNextDailyReset());
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(`SerpHouse error: ${response.status}`);
      }
      const data = await response.json();
      if (ledger) {
        ledger.recordSuccess("serphouse");
        ledger.incrementDailyUsed("serphouse");
      }
      return this.normalizeResults(data.results || [], options);
    } catch (error) {
      if (ledger) {
        if (error.message.includes("QUOTA")) {
          ledger.markQuotaExceeded("serphouse", this.getNextDailyReset());
        } else {
          ledger.recordError("serphouse", "5xx");
        }
      }
      throw error;
    }
  }
  normalizeResults(results, options) {
    return results.map((item) => ({
      title: item.title || "No title",
      url: item.url || "#",
      snippet: item.description || "",
      published_at: item.date || null,
      author: item.domain || null,
      thumbnail: null,
      score: 0.7,
      extra: {
        provider: "serphouse",
        position: item.position,
        domain: item.domain
      }
    }));
  }
  getNextDailyReset() {
    const now2 = /* @__PURE__ */ new Date();
    const nextReset = new Date(now2);
    nextReset.setUTCHours(4, 0, 0, 0);
    if (nextReset <= now2) {
      nextReset.setDate(nextReset.getDate() + 1);
    }
    return nextReset.toISOString();
  }
};

// src/lib/sources/adultmedia.js
var AdultMediaProvider = class {
  static {
    __name(this, "AdultMediaProvider");
  }
  constructor() {
    this.name = "AdultMedia";
    this.baseUrl = "https://porn-api-adultdatalink.p.rapidapi.com/pornpics/search";
    this.requestsDailyCap = 50;
    this.objectsDailyCap = 1250;
    this.monthlyCap = 1500;
    this.ttl = 5 * 24 * 60 * 60;
    this.batchSize = 25;
  }
  async search(query, options, env) {
    const apiKey = env.RAPIDAPI_KEY;
    if (!apiKey) {
      console.warn("RapidAPI key not configured");
      return [];
    }
    const ledger = options.ledger;
    if (ledger) {
      const state = ledger.getProviderState("adultmedia");
      if (state.requestsDailyUsed >= this.requestsDailyCap) {
        ledger.markQuotaExceeded("adultmedia", this.getNextDailyReset());
        throw new Error("QUOTA_EXCEEDED_DAILY");
      }
    }
    try {
      const params = new URLSearchParams({
        q: query,
        limit: Math.min(options.limit || 10, this.batchSize)
      });
      if (options.fresh && options.fresh !== "all") {
        const days = options.fresh.replace("d", "");
        params.append("freshness", `d${days}`);
      }
      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: "GET",
        headers: {
          "x-rapidapi-host": "porn-api-adultdatalink.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
          "User-Agent": "Jack-Portal/2.0.0"
        },
        cf: { timeout: 15e3 }
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded("adultmedia", this.getNextDailyReset());
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(`AdultMedia API error: ${response.status}`);
      }
      if (ledger) {
        ledger.recordSuccess("adultmedia");
        ledger.incrementRequestsDailyUsed("adultmedia");
        const objectsReturned = (data.results || []).length;
        ledger.incrementObjectsDailyUsed("adultmedia", objectsReturned);
      }
      return (data.results || []).map((item) => ({
        title: item.title || "No title",
        url: item.url || "#",
        snippet: item.description || "",
        score: item.score || 0,
        thumbnail: item.thumbnail || null,
        published_at: item.published_at || null,
        author: item.author || null,
        extra: {
          provider: "adultmedia",
          category: item.category,
          tags: item.tags
        }
      }));
    } catch (error) {
      if (ledger) {
        if (error.message.includes("QUOTA")) {
          ledger.markQuotaExceeded("adultmedia", this.getNextDailyReset());
        } else {
          ledger.recordError("adultmedia", "5xx");
        }
      }
      throw error;
    }
  }
  getNextDailyReset() {
    const now2 = /* @__PURE__ */ new Date();
    const nextReset = new Date(now2);
    nextReset.setUTCHours(4, 0, 0, 0);
    if (nextReset <= now2) {
      nextReset.setDate(nextReset.getDate() + 1);
    }
    return nextReset.toISOString();
  }
};

// src/lib/sources/qualityporn.js
var QualityPornProvider = class {
  static {
    __name(this, "QualityPornProvider");
  }
  constructor() {
    this.name = "QualityPorn";
    this.baseUrl = "https://quality-porn.p.rapidapi.com/docs";
    this.version = "1.0.0";
    this.dailyCap = 300;
    this.monthlyCap = 9e3;
    this.ttl = 24 * 60 * 60;
    this.batchSize = 20;
  }
  async search(query, options, env) {
    const apiKey = env.RAPIDAPI_KEY;
    if (!apiKey) {
      console.warn("RapidAPI key not configured");
      return [];
    }
    const ledger = options.ledger;
    if (ledger) {
      const state = ledger.getProviderState("qualityporn");
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded("qualityporn", this.getNextDailyReset());
        throw new Error("QUOTA_EXCEEDED_DAILY");
      }
    }
    try {
      const params = new URLSearchParams({
        q: query,
        limit: Math.min(options.limit || 10, this.batchSize)
      });
      if (options.fresh && options.fresh !== "all") {
        const days = options.fresh.replace("d", "");
        params.append("freshness", `d${days}`);
      }
      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: "GET",
        headers: {
          "x-rapidapi-host": "quality-porn.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
          "User-Agent": "Jack-Portal/2.0.0"
        },
        cf: { timeout: 1e4 }
      });
      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded("qualityporn", this.getNextDailyReset());
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(`QualityPorn error: ${response.status}`);
      }
      const data = await response.json();
      if (ledger) {
        ledger.recordSuccess("qualityporn");
        ledger.incrementDailyUsed("qualityporn");
      }
      return this.normalizeResults(data.results || [], options);
    } catch (error) {
      if (ledger) {
        if (error.message.includes("QUOTA")) {
          ledger.markQuotaExceeded("qualityporn", this.getNextDailyReset());
        } else {
          ledger.recordError("qualityporn", "5xx");
        }
      }
      throw error;
    }
  }
  normalizeResults(results, options) {
    return results.map((item) => ({
      title: item.title || "No title",
      url: item.url || "#",
      snippet: item.description || "",
      published_at: item.published_at || null,
      author: item.author || null,
      thumbnail: item.thumbnail || null,
      score: 0.6,
      extra: {
        provider: "qualityporn",
        category: item.category,
        tags: item.tags || []
      }
    }));
  }
  getNextDailyReset() {
    const now2 = /* @__PURE__ */ new Date();
    const nextReset = new Date(now2);
    nextReset.setUTCHours(4, 0, 0, 0);
    if (nextReset <= now2) {
      nextReset.setDate(nextReset.getDate() + 1);
    }
    return nextReset.toISOString();
  }
};

// src/lib/sources/apify.js
var ApifyProvider = class {
  static {
    __name(this, "ApifyProvider");
  }
  constructor() {
    this.name = "Apify";
    this.baseUrl = "https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items";
    this.version = "1.0.0";
    this.monthlyCap = 1428;
    this.ttl = 24 * 60 * 60;
    this.batchSize = 50;
  }
  async search(query, options, env) {
    const apiKey = env.APIFY_TOKEN;
    if (!apiKey) {
      console.warn("Apify API token not configured");
      return [];
    }
    const ledger = options.ledger;
    if (ledger) {
      const state = ledger.getProviderState("apify");
      if (state.monthlyUsed >= this.monthlyCap) {
        ledger.markQuotaExceeded("apify");
        throw new Error("QUOTA_EXCEEDED_MONTHLY");
      }
    }
    try {
      const runParams = {
        queries: [query],
        maxPagesPerQuery: 1,
        resultsPerPage: Math.min(options.limit || 10, this.batchSize),
        languageCode: "en",
        regionCode: "us",
        mobileResults: false
      };
      if (options.fresh && options.fresh !== "all") {
        const days = options.fresh.replace("d", "");
        runParams.dateRange = `d${days}`;
      }
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "User-Agent": "Jack-Portal/2.0.0"
        },
        body: JSON.stringify(runParams),
        cf: { timeout: 3e4 }
      });
      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded("apify");
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(`Apify error: ${response.status}`);
      }
      const results = await response.json();
      if (ledger) {
        ledger.recordSuccess("apify");
        ledger.incrementMonthlyUsed("apify");
      }
      return this.normalizeResults(results, options);
    } catch (error) {
      if (ledger) {
        if (error.message.includes("QUOTA")) {
          ledger.markQuotaExceeded("apify");
        } else {
          ledger.recordError("apify", "5xx");
        }
      }
      throw error;
    }
  }
  normalizeResults(results, options) {
    return results.map((item) => ({
      title: item.title || "No title",
      url: item.url || "#",
      snippet: item.snippet || item.description || "",
      published_at: item.date || null,
      author: item.displayedLink || null,
      thumbnail: item.thumbnail || null,
      score: 0.5,
      extra: {
        provider: "apify",
        position: item.position,
        domain: item.domain
      }
    }));
  }
};

// src/lib/robots-checker.js
var RobotsChecker = class {
  static {
    __name(this, "RobotsChecker");
  }
  constructor(env) {
    this.env = env;
    this.cache = env.CACHE;
    this.cacheTtl = 6 * 60 * 60;
  }
  /**
   * Check if crawling is allowed for a URL
   * @param {string} url - The URL to check
   * @param {string} userAgent - User agent string (defaults to Jack-Portal)
   * @returns {Promise<Object>} - {allowed: boolean, status: string, cached: boolean}
   */
  async isAllowed(url, userAgent = "Jack-Portal/2.0.0") {
    try {
      const domain = this._extractDomain(url);
      if (!domain) {
        return { allowed: true, status: "no_domain", cached: false };
      }
      const overrideResult = this._checkOverrideMap(domain);
      if (overrideResult) {
        return { ...overrideResult, cached: false };
      }
      const cacheKey = `robots:${domain}`;
      const cached = await this._getCachedRobots(cacheKey);
      if (cached) {
        const allowed2 = this._checkRobotsRules(cached.rules, url, userAgent);
        return { allowed: allowed2, status: "cached", cached: true };
      }
      const robotsUrl = `https://${domain}/robots.txt`;
      const response = await fetch(robotsUrl, {
        headers: { "User-Agent": userAgent },
        cf: { timeout: 5e3 }
        // 5 second timeout
      });
      if (!response.ok) {
        return { allowed: true, status: "unavailable", cached: false };
      }
      const robotsText = await response.text();
      const rules = this._parseRobotsTxt(robotsText);
      await this._cacheRobotsRules(cacheKey, rules);
      const allowed = this._checkRobotsRules(rules, url, userAgent);
      return { allowed, status: "fetched", cached: false };
    } catch (error) {
      console.warn("Robots check error:", error.message);
      return { allowed: true, status: "error", cached: false };
    }
  }
  /**
   * Extract domain from URL
   */
  _extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }
  /**
   * Check domain override map
   */
  _checkOverrideMap(domain) {
    const override = ROBOTS_OVERRIDE_MAP[domain];
    if (!override) return null;
    switch (override) {
      case "force_allow":
        return { allowed: true, status: "override_allow" };
      case "force_block":
        return { allowed: false, status: "override_block" };
      default:
        return null;
    }
  }
  /**
   * Get cached robots rules
   */
  async _getCachedRobots(cacheKey) {
    if (!this.cache) return null;
    try {
      const cached = await this.cache.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }
  /**
   * Cache robots rules
   */
  async _cacheRobotsRules(cacheKey, rules) {
    if (!this.cache) return;
    try {
      await this.cache.put(cacheKey, JSON.stringify(rules), {
        expirationTtl: this.cacheTtl
      });
    } catch (error) {
      console.warn("Failed to cache robots rules:", error.message);
    }
  }
  /**
   * Parse robots.txt content
   */
  _parseRobotsTxt(text) {
    const lines = text.split("\n").map((line) => line.trim());
    const rules = { "*": [], "Jack-Portal/2.0.0": [] };
    let currentUserAgent = null;
    for (const line of lines) {
      if (line.startsWith("#") || line === "") continue;
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;
      const directive = line.substring(0, colonIndex).trim().toLowerCase();
      const value = line.substring(colonIndex + 1).trim();
      if (directive === "user-agent") {
        currentUserAgent = value;
        if (!rules[currentUserAgent]) {
          rules[currentUserAgent] = [];
        }
      } else if (directive === "disallow" && currentUserAgent) {
        rules[currentUserAgent].push({
          type: "disallow",
          path: value
        });
      } else if (directive === "allow" && currentUserAgent) {
        rules[currentUserAgent].push({
          type: "allow",
          path: value
        });
      }
    }
    return rules;
  }
  /**
   * Check if URL is allowed by robots rules
   */
  _checkRobotsRules(rules, url, userAgent) {
    const userAgentRules = rules[userAgent] || rules["*"] || [];
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;
    for (const rule of userAgentRules) {
      if (this._pathMatches(path, rule.path)) {
        return rule.type === "allow";
      }
    }
    return true;
  }
  /**
   * Check if path matches robots rule pattern
   */
  _pathMatches(path, rulePath) {
    if (rulePath === "") return true;
    if (rulePath === "/") return path.startsWith("/");
    const pattern = rulePath.replace(/\*/g, ".*");
    const regex = new RegExp(`^${pattern}`);
    return regex.test(path);
  }
};
var ROBOTS_OVERRIDE_MAP = {
  // 'example.com': 'force_allow',  // Uncomment and replace with actual domains
  // 'problematic-site.com': 'force_block',
};

// src/lib/sources/scrapers.js
var ScrapersProvider = class {
  static {
    __name(this, "ScrapersProvider");
  }
  constructor() {
    this.name = "Scrapers";
    this.baseUrl = "https://scrapers-api.example.com";
    this.version = "1.1.0";
    this.robotsChecker = null;
  }
  async search(query, options, env) {
    const apiKey = env.SCRAPERS_API_KEY;
    if (!apiKey || apiKey === "your_scrapers_api_key_here" || apiKey.includes("your_")) {
      console.warn("Scrapers API key not configured or using placeholder");
      return [];
    }
    try {
      const requestBody = {
        query,
        limit: Math.min(options.limit || 10, 15),
        safemode: options.safeMode,
        fresh: options.fresh,
        duration: options.duration,
        site: options.site,
        // Add freshness and duration parameters for server-side filtering
        freshness_filter: this.buildFreshnessFilter(options.fresh),
        duration_filter: options.duration
      };
      const response = await fetch(`${this.baseUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "User-Agent": "Jack-Portal/2.0.0"
        },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(`Scrapers API error: ${response.status}`);
      }
      const processedResults = (data.results || []).map((item) => {
        const enhanced = this.enhanceWithQualityMetrics(item, options);
        return {
          title: enhanced.title || "No title",
          url: enhanced.url || "#",
          snippet: enhanced.snippet || enhanced.description || "",
          score: enhanced.score || 0.5,
          thumbnail: enhanced.thumbnail || null,
          published_at: enhanced.published_at || null,
          author: enhanced.author || enhanced.source || null,
          extra: {
            scraped_at: enhanced.scraped_at,
            content_type: enhanced.content_type || "article",
            word_count: enhanced.word_count || 0,
            readability_score: enhanced.readability_score || 0,
            quality_score: enhanced.quality_score || 0.5,
            source_freshness: enhanced.source_freshness || "unknown",
            robots_allowed: enhanced.robots_allowed !== false,
            last_modified: enhanced.last_modified || null,
            adapter_version: this.version,
            tags: enhanced.tags || []
          }
        };
      });
      return processedResults;
    } catch (error) {
      if (error.message === "QUOTA_EXCEEDED") {
        throw error;
      }
      console.warn("Scrapers search error:", error.message);
      return [];
    }
  }
  buildFreshnessFilter(fresh) {
    if (!fresh || fresh === "all") return null;
    const now2 = /* @__PURE__ */ new Date();
    let cutoffDate;
    switch (fresh) {
      case "d1":
        cutoffDate = new Date(now2.getTime() - 24 * 60 * 60 * 1e3);
        break;
      case "d7":
        cutoffDate = new Date(now2.getTime() - 7 * 24 * 60 * 60 * 1e3);
        break;
      case "d30":
        cutoffDate = new Date(now2.getTime() - 30 * 24 * 60 * 60 * 1e3);
        break;
      case "d365":
        cutoffDate = new Date(now2.getTime() - 365 * 24 * 60 * 60 * 1e3);
        break;
      default:
        return null;
    }
    return cutoffDate.toISOString();
  }
  enhanceWithQualityMetrics(item, options) {
    const enhanced = { ...item };
    const text = item.snippet || item.description || "";
    if (text) {
      enhanced.word_count = text.split(/\s+/).length;
    }
    enhanced.readability_score = this.calculateReadabilityScore(text);
    enhanced.quality_score = this.calculateQualityScore(enhanced);
    enhanced.source_freshness = this.assessFreshness(item.published_at, options.fresh);
    enhanced.robots_status = "checking";
    enhanced.robots_allowed = true;
    enhanced.content_type = this.detectContentType(item);
    return enhanced;
  }
  calculateReadabilityScore(text) {
    if (!text || text.length === 0) return 0;
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const syllables = this.countSyllables(text);
    if (sentences === 0) return 0;
    const avgWordsPerSentence = words / sentences;
    const avgSyllablesPerWord = syllables / words;
    const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    return Math.max(0, Math.min(100, score));
  }
  countSyllables(text) {
    const words = text.toLowerCase().split(/\s+/);
    let syllables = 0;
    for (const word of words) {
      syllables += this.countWordSyllables(word);
    }
    return syllables;
  }
  countWordSyllables(word) {
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
    word = word.replace(/^y/, "");
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }
  calculateQualityScore(item) {
    let score = 0.5;
    if (item.title && item.title.length > 10 && item.title.length < 100) {
      score += 0.1;
    }
    if (item.word_count && item.word_count > 50) {
      score += 0.1;
    }
    if (item.readability_score && item.readability_score > 30 && item.readability_score < 80) {
      score += 0.1;
    }
    if (item.author || item.source) {
      score += 0.05;
    }
    if (item.published_at) {
      score += 0.05;
    }
    if (item.source_freshness === "fresh") {
      score += 0.1;
    }
    return Math.max(0, Math.min(1, score));
  }
  assessFreshness(publishedAt, freshFilter) {
    if (!publishedAt || !freshFilter || freshFilter === "all") {
      return "unknown";
    }
    try {
      const published = new Date(publishedAt);
      const now2 = /* @__PURE__ */ new Date();
      const ageMs = now2.getTime() - published.getTime();
      switch (freshFilter) {
        case "d1":
          return ageMs <= 24 * 60 * 60 * 1e3 ? "fresh" : "stale";
        case "d7":
          return ageMs <= 7 * 24 * 60 * 60 * 1e3 ? "fresh" : "stale";
        case "d30":
          return ageMs <= 30 * 24 * 60 * 60 * 1e3 ? "fresh" : "stale";
        case "d365":
          return ageMs <= 365 * 24 * 60 * 60 * 1e3 ? "fresh" : "stale";
        default:
          return "unknown";
      }
    } catch (error) {
      return "unknown";
    }
  }
  detectContentType(item) {
    const title = (item.title || "").toLowerCase();
    const snippet = (item.snippet || item.description || "").toLowerCase();
    const url = (item.url || "").toLowerCase();
    if (url.includes("/blog/") || title.includes("blog") || snippet.includes("posted")) {
      return "blog";
    }
    if (url.includes("/news/") || title.includes("news") || snippet.includes("breaking")) {
      return "news";
    }
    if (url.includes("/forum/") || url.includes("/thread/") || snippet.includes("reply")) {
      return "forum";
    }
    if (url.includes("/docs/") || url.includes("/documentation/") || snippet.includes("api")) {
      return "documentation";
    }
    return "article";
  }
  async checkRobotsCompliance(url, env) {
    if (!this.robotsChecker) {
      this.robotsChecker = new RobotsChecker(env);
    }
    try {
      const result = await this.robotsChecker.isAllowed(url);
      return {
        allowed: result.allowed,
        status: result.status,
        cached: result.cached
      };
    } catch (error) {
      console.warn("Robots compliance check failed:", error.message);
      return {
        allowed: true,
        // Default to allowed on error
        status: "error",
        cached: false
      };
    }
  }
};

// src/lib/sources/adapters.js
var AdaptersProvider = class {
  static {
    __name(this, "AdaptersProvider");
  }
  constructor() {
    this.name = "Adapters";
    this.baseUrl = "https://adapters-api.example.com";
    this.version = "1.1.0";
    this.robotsChecker = null;
  }
  async search(query, options, env) {
    const apiKey = env.ADAPTERS_API_KEY;
    if (!apiKey || apiKey === "your_adapters_api_key_here" || apiKey.includes("your_")) {
      console.warn("Adapters API key not configured or using placeholder");
      return [];
    }
    try {
      const requestBody = {
        query,
        limit: Math.min(options.limit || 10, 15),
        safemode: options.safeMode,
        fresh: options.fresh,
        duration: options.duration,
        site: options.site,
        // Enhanced parameters for better adapter matching
        freshness_filter: this.buildFreshnessFilter(options.fresh),
        duration_filter: options.duration,
        content_types: ["article", "blog", "news", "documentation"]
      };
      const response = await fetch(`${this.baseUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "User-Agent": "Jack-Portal/2.0.0"
        },
        body: JSON.stringify(requestBody),
        cf: { timeout: 1e4 }
        // 10 second timeout
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(`Adapters API error: ${response.status}`);
      }
      const processedResults = (data.results || []).map((item) => {
        const normalized = this.normalizeAdapterResult(item, options);
        return {
          title: normalized.title || "No title",
          url: normalized.url || "#",
          snippet: normalized.snippet || "",
          score: normalized.score || 0.5,
          thumbnail: normalized.thumbnail || null,
          published_at: normalized.published_at || null,
          author: normalized.author || null,
          extra: {
            adapter_type: normalized.adapter_type || "generic",
            confidence: normalized.confidence || 0.5,
            content_type: normalized.content_type || "article",
            language: normalized.language || "en",
            tags: normalized.tags || [],
            word_count: normalized.word_count || 0,
            readability_score: normalized.readability_score || 0,
            quality_score: normalized.quality_score || 0.5,
            source_freshness: normalized.source_freshness || "unknown",
            robots_allowed: normalized.robots_allowed !== false,
            last_modified: normalized.last_modified || null,
            adapter_version: this.version
          }
        };
      });
      return processedResults;
    } catch (error) {
      if (error.message === "QUOTA_EXCEEDED") {
        throw error;
      }
      console.warn("Adapters search error:", error.message);
      return [];
    }
  }
  buildFreshnessFilter(fresh) {
    if (!fresh || fresh === "all") return null;
    const now2 = /* @__PURE__ */ new Date();
    let cutoffDate;
    switch (fresh) {
      case "d1":
        cutoffDate = new Date(now2.getTime() - 24 * 60 * 60 * 1e3);
        break;
      case "d7":
        cutoffDate = new Date(now2.getTime() - 7 * 24 * 60 * 60 * 1e3);
        break;
      case "d30":
        cutoffDate = new Date(now2.getTime() - 30 * 24 * 60 * 60 * 1e3);
        break;
      case "d365":
        cutoffDate = new Date(now2.getTime() - 365 * 24 * 60 * 60 * 1e3);
        break;
      default:
        return null;
    }
    return cutoffDate.toISOString();
  }
  normalizeAdapterResult(item, options) {
    const normalized = { ...item };
    normalized.adapter_type = this.detectAdapterType(item);
    normalized.confidence = typeof item.confidence === "number" ? Math.max(0, Math.min(1, item.confidence)) : 0.5;
    const text = item.snippet || item.description || "";
    if (text) {
      normalized.word_count = text.split(/\s+/).length;
    }
    normalized.readability_score = this.calculateReadabilityScore(text);
    normalized.quality_score = this.calculateAdapterQualityScore(normalized);
    normalized.source_freshness = this.assessFreshness(item.published_at, options.fresh);
    normalized.language = this.detectLanguage(item);
    normalized.tags = this.extractAndNormalizeTags(item);
    normalized.content_type = this.detectContentType(item);
    normalized.robots_status = "checking";
    normalized.robots_allowed = true;
    return normalized;
  }
  detectAdapterType(item) {
    if (item.source === "twitter" || item.source === "x") {
      return "social";
    }
    if (item.source === "reddit") {
      return "forum";
    }
    if (item.source === "hackernews" || item.source === "hn") {
      return "news";
    }
    if (item.api_source || item.adapter_name) {
      return item.api_source || item.adapter_name;
    }
    return "generic";
  }
  calculateReadabilityScore(text) {
    if (!text || text.length === 0) return 0;
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    if (sentences === 0) return 0;
    const avgWordsPerSentence = words / sentences;
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) {
      return 70;
    } else if (avgWordsPerSentence >= 5 && avgWordsPerSentence <= 25) {
      return 50;
    } else {
      return 30;
    }
  }
  calculateAdapterQualityScore(item) {
    let score = 0.5;
    if (item.confidence && item.confidence > 0.7) {
      score += 0.1;
    }
    if (item.word_count && item.word_count > 30) {
      score += 0.1;
    }
    if (item.readability_score && item.readability_score > 40) {
      score += 0.1;
    }
    if (item.author || item.source) {
      score += 0.05;
    }
    if (item.published_at) {
      score += 0.05;
    }
    if (item.source_freshness === "fresh") {
      score += 0.1;
    }
    switch (item.adapter_type) {
      case "news":
        score += 0.05;
        break;
      case "documentation":
        score += 0.05;
        break;
      case "social":
        score -= 0.05;
        break;
    }
    return Math.max(0, Math.min(1, score));
  }
  assessFreshness(publishedAt, freshFilter) {
    if (!publishedAt || !freshFilter || freshFilter === "all") {
      return "unknown";
    }
    try {
      const published = new Date(publishedAt);
      const now2 = /* @__PURE__ */ new Date();
      const ageMs = now2.getTime() - published.getTime();
      switch (freshFilter) {
        case "d1":
          return ageMs <= 24 * 60 * 60 * 1e3 ? "fresh" : "stale";
        case "d7":
          return ageMs <= 7 * 24 * 60 * 60 * 1e3 ? "fresh" : "stale";
        case "d30":
          return ageMs <= 30 * 24 * 60 * 60 * 1e3 ? "fresh" : "stale";
        case "d365":
          return ageMs <= 365 * 24 * 60 * 60 * 1e3 ? "fresh" : "stale";
        default:
          return "unknown";
      }
    } catch (error) {
      return "unknown";
    }
  }
  detectLanguage(item) {
    const text = (item.title || "") + " " + (item.snippet || "");
    if (text.match(/[àáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/i)) {
      return "other";
    }
    return "en";
  }
  extractAndNormalizeTags(item) {
    const tags = [];
    if (item.tags && Array.isArray(item.tags)) {
      tags.push(...item.tags);
    }
    if (item.categories && Array.isArray(item.categories)) {
      tags.push(...item.categories);
    }
    const text = ((item.title || "") + " " + (item.snippet || "")).toLowerCase();
    const keywords = ["javascript", "python", "react", "node", "api", "tutorial", "guide"];
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        tags.push(keyword);
      }
    }
    return [...new Set(tags.map(
      (tag) => typeof tag === "string" ? tag.toLowerCase().trim() : ""
    ).filter((tag) => tag.length > 0))].slice(0, 10);
  }
  detectContentType(item) {
    const title = (item.title || "").toLowerCase();
    const snippet = (item.snippet || "").toLowerCase();
    const url = (item.url || "").toLowerCase();
    if (url.includes("/blog/") || title.includes("blog") || snippet.includes("posted")) {
      return "blog";
    }
    if (url.includes("/news/") || title.includes("news") || snippet.includes("breaking")) {
      return "news";
    }
    if (url.includes("/docs/") || url.includes("/documentation/") || snippet.includes("api")) {
      return "documentation";
    }
    if (item.adapter_type === "social" || item.adapter_type === "forum") {
      return item.adapter_type;
    }
    return "article";
  }
  async checkRobotsCompliance(url, env) {
    if (!this.robotsChecker) {
      this.robotsChecker = new RobotsChecker(env);
    }
    try {
      const result = await this.robotsChecker.isAllowed(url);
      return {
        allowed: result.allowed,
        status: result.status,
        cached: result.cached
      };
    } catch (error) {
      console.warn("Robots compliance check failed:", error.message);
      return {
        allowed: true,
        // Default to allowed on error
        status: "error",
        cached: false
      };
    }
  }
};

// src/lib/sources/seznam.js
var SeznamProvider = class {
  static {
    __name(this, "SeznamProvider");
  }
  constructor() {
    this.name = "Seznam";
    this.baseUrl = "https://search-seznam.p.rapidapi.com/";
    this.dailyCap = 6;
    this.monthlyCap = 200;
    this.ttl = 24 * 60 * 60;
    this.batchSize = 25;
  }
  async search(query, options, env) {
    const apiKey = env.RAPIDAPI_KEY;
    if (!apiKey) {
      console.warn("RapidAPI key not configured");
      return [];
    }
    const ledger = options.ledger;
    if (ledger) {
      const state = ledger.getProviderState("seznam");
      if (state.dailyUsed >= this.dailyCap) {
        ledger.markQuotaExceeded("seznam", this.getNextDailyReset());
        throw new Error("QUOTA_EXCEEDED_DAILY");
      }
    }
    try {
      const params = new URLSearchParams({
        q: query,
        count: Math.min(options.limit || 10, this.batchSize),
        format: "json",
        lang: "en"
      });
      if (options.fresh && options.fresh !== "all") {
        const days = options.fresh.replace("d", "");
        params.append("freshness", `pd${days}`);
      }
      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: "GET",
        headers: {
          "x-rapidapi-host": "search-seznam.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
          "User-Agent": "Jack-Portal/2.0.0"
        },
        cf: { timeout: 1e4 }
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          if (ledger) ledger.markQuotaExceeded("seznam", this.getNextDailyReset());
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(`Seznam API error: ${data.error || response.status}`);
      }
      if (ledger) {
        ledger.recordSuccess("seznam");
        ledger.incrementDailyUsed("seznam");
      }
      return this.normalizeResults(data.results || [], options);
    } catch (error) {
      if (ledger) {
        if (error.message.includes("QUOTA")) {
          ledger.markQuotaExceeded("seznam", this.getNextDailyReset());
        } else {
          ledger.recordError("seznam", "5xx");
        }
      }
      throw error;
    }
  }
  normalizeResults(results, options) {
    return results.map((item) => ({
      title: item.title || "No title",
      url: item.url || "#",
      snippet: item.snippet || "",
      published_at: item.date || null,
      author: item.domain || null,
      thumbnail: item.thumbnail || null,
      score: 0.85,
      extra: {
        provider: "seznam",
        position: item.position,
        domain: item.domain
      }
    }));
  }
  getNextDailyReset() {
    const now2 = /* @__PURE__ */ new Date();
    const nextReset = new Date(now2);
    nextReset.setUTCHours(4, 0, 0, 0);
    if (nextReset <= now2) {
      nextReset.setDate(nextReset.getDate() + 1);
    }
    return nextReset.toISOString();
  }
};

// src/lib/provider-ledger.js
var ProviderLedger = class {
  static {
    __name(this, "ProviderLedger");
  }
  constructor(env) {
    this.env = env;
    this.kv = env.PROVIDER_LEDGER;
    this.inMemoryStates = /* @__PURE__ */ new Map();
    this.memoryTtl = 5 * 60 * 1e3;
    this.defaultQuotaResetMs = parseInt(env.LEDGER_DEFAULT_QUOTA_RESET_MS || "3600000");
    this.tempFailCooldownMs = parseInt(env.TEMP_FAIL_COOLDOWN_MS || "300000");
    this.failureWindowMs = 5 * 60 * 1e3;
    this.maxFailures = 3;
  }
  /**
   * Load all provider states from KV
   */
  async loadStates() {
    if (!this.kv) {
      console.warn("PROVIDER_LEDGER KV not available, using in-memory only");
      return;
    }
    try {
      const keys = await this.kv.list({ prefix: "providers:" });
      const states = /* @__PURE__ */ new Map();
      for (const key of keys.keys) {
        try {
          const value = await this.kv.get(key.name);
          if (value) {
            const state = JSON.parse(value);
            states.set(key.name.replace("providers:", ""), state);
          }
        } catch (error) {
          console.warn(`Failed to load state for ${key.name}:`, error.message);
        }
      }
      this.inMemoryStates = states;
    } catch (error) {
      console.warn("Failed to load provider states from KV:", error.message);
    }
  }
  /**
   * Save all provider states to KV
   */
  async saveStates() {
    if (!this.kv) return;
    try {
      const promises = [];
      for (const [name, state] of this.inMemoryStates) {
        promises.push(this.kv.put(`providers:${name}`, JSON.stringify(state)));
      }
      await Promise.all(promises);
    } catch (error) {
      console.warn("Failed to save provider states to KV:", error.message);
    }
  }
  /**
   * Get provider state
   */
  getProviderState(name) {
    return this.inMemoryStates.get(name) || this._createDefaultState();
  }
  /**
   * Get all provider states for diagnostics
   */
  getDiagnostics(providerName = null) {
    if (providerName) {
      return this.getProviderState(providerName);
    }
    const states = {};
    for (const [name, state] of this.inMemoryStates) {
      states[name] = this._formatStateForDiagnostics(state);
    }
    return states;
  }
  /**
   * Format state for diagnostics (hide sensitive data)
   */
  _formatStateForDiagnostics(state) {
    const totalRequests = (state.rolling.successCount || 0) + (state.rolling.timeoutCount || 0) + (state.rolling.error4xxCount || 0) + (state.rolling.error5xxCount || 0);
    const successRate = totalRequests > 0 ? ((state.rolling.successCount || 0) / totalRequests * 100).toFixed(1) : "0.0";
    const timeoutRate = totalRequests > 0 ? ((state.rolling.timeoutCount || 0) / totalRequests * 100).toFixed(1) : "0.0";
    const error4xxRate = totalRequests > 0 ? ((state.rolling.error4xxCount || 0) / totalRequests * 100).toFixed(1) : "0.0";
    const error5xxRate = totalRequests > 0 ? ((state.rolling.error5xxCount || 0) / totalRequests * 100).toFixed(1) : "0.0";
    return {
      status: state.status,
      resetAt: state.resetAt,
      lastUsedAt: state.lastUsedAt,
      successRate: `${successRate}%`,
      timeoutRate: `${timeoutRate}%`,
      error4xxRate: `${error4xxRate}%`,
      error5xxRate: `${error5xxRate}%`,
      p50Latency: state.latencyMsP50,
      p95Latency: state.latencyMsP95,
      dailyUsed: state.dailyUsed || 0,
      dailyCap: state.dailyCap || 0,
      monthlyUsed: state.monthlyUsed || 0,
      monthlyCap: state.monthlyCap || 0,
      remaining: Math.max(0, (state.dailyCap || 0) - (state.dailyUsed || 0)),
      // AdultMedia dual-cap support
      requestsDailyUsed: state.requestsDailyUsed || 0,
      requestsDailyCap: state.requestsDailyCap || 0,
      objectsDailyUsed: state.objectsDailyUsed || 0,
      objectsDailyCap: state.objectsDailyCap || 0,
      requestsRemaining: Math.max(0, (state.requestsDailyCap || 0) - (state.requestsDailyUsed || 0)),
      lastSkipReason: state.lastSkipReason || null,
      rolling: state.rolling
    };
  }
  /**
   * Check if provider should be used
   */
  shouldUse(name, now2 = Date.now()) {
    const state = this.getProviderState(name);
    if (state.status === "QUOTA_EXCEEDED") {
      if (state.resetAt && now2 >= new Date(state.resetAt).getTime()) {
        state.status = "OK";
        state.resetAt = null;
        this.inMemoryStates.set(name, state);
        return true;
      }
      return false;
    }
    if (state.status === "TEMP_FAIL") {
      if (state.resetAt && now2 >= new Date(state.resetAt).getTime()) {
        state.status = "OK";
        state.resetAt = null;
        this.inMemoryStates.set(name, state);
        return true;
      }
      return false;
    }
    return state.status === "OK";
  }
  /**
   * Check if provider is healthy (OK status)
   */
  isProviderHealthy(name) {
    return this.shouldUse(name);
  }
  /**
   * Record successful request
   */
  recordSuccess(name, latencyMs = null) {
    const state = this.getProviderState(name);
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    state.status = "OK";
    state.lastSuccessAt = now2;
    state.lastUsedAt = now2;
    state.resetAt = null;
    state.rolling.successCount = (state.rolling.successCount || 0) + 1;
    if (latencyMs !== null) {
      this._updateLatencyEstimates(state, latencyMs);
    }
    this.inMemoryStates.set(name, state);
  }
  /**
   * Record timeout error
   */
  recordTimeout(name) {
    const state = this.getProviderState(name);
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    state.lastFailureAt = now2;
    state.lastUsedAt = now2;
    state.rolling.timeoutCount = (state.rolling.timeoutCount || 0) + 1;
    this._checkFailureThreshold(name, state);
    this.inMemoryStates.set(name, state);
  }
  /**
   * Record 4xx error
   */
  recordError(name, type) {
    const state = this.getProviderState(name);
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    state.lastFailureAt = now2;
    state.lastUsedAt = now2;
    if (type === "4xx") {
      state.rolling.error4xxCount = (state.rolling.error4xxCount || 0) + 1;
    } else if (type === "5xx") {
      state.rolling.error5xxCount = (state.rolling.error5xxCount || 0) + 1;
    }
    this._checkFailureThreshold(name, state);
    this.inMemoryStates.set(name, state);
  }
  /**
   * Mark quota exceeded
   */
  markQuotaExceeded(name, resetAtHint = null) {
    const state = this.getProviderState(name);
    const now2 = Date.now();
    state.status = "QUOTA_EXCEEDED";
    state.lastFailureAt = (/* @__PURE__ */ new Date()).toISOString();
    state.lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.rolling.quotaCount = (state.rolling.quotaCount || 0) + 1;
    if (resetAtHint) {
      state.resetAt = resetAtHint;
    } else {
      state.resetAt = new Date(now2 + this.defaultQuotaResetMs).toISOString();
    }
    this.inMemoryStates.set(name, state);
  }
  /**
   * Create default state for new providers
   */
  _createDefaultState() {
    return {
      status: "OK",
      resetAt: null,
      lastFailureAt: null,
      lastSuccessAt: null,
      lastUsedAt: null,
      dailyUsed: 0,
      dailyCap: 0,
      monthlyUsed: 0,
      monthlyCap: 0,
      // AdultMedia dual-cap support
      requestsDailyUsed: 0,
      requestsDailyCap: 0,
      objectsDailyUsed: 0,
      objectsDailyCap: 0,
      nextDailyResetAt: this._getNextDailyReset(),
      nextMonthlyResetAt: this._getNextMonthlyReset(),
      lastSkipReason: null,
      rolling: {
        successCount: 0,
        timeoutCount: 0,
        error4xxCount: 0,
        error5xxCount: 0,
        quotaCount: 0
      },
      latencyMsP50: null,
      latencyMsP95: null,
      latencySamples: []
    };
  }
  /**
   * Update latency estimates using rolling window
   */
  _updateLatencyEstimates(state, latencyMs) {
    if (!state.latencySamples) state.latencySamples = [];
    state.latencySamples.push(latencyMs);
    if (state.latencySamples.length > 100) {
      state.latencySamples.shift();
    }
    if (state.latencySamples.length >= 10) {
      const sorted = [...state.latencySamples].sort((a, b) => a - b);
      state.latencyMsP50 = sorted[Math.floor(sorted.length * 0.5)];
      state.latencyMsP95 = sorted[Math.floor(sorted.length * 0.95)];
    }
  }
  /**
   * Check if failures exceed threshold and trigger TEMP_FAIL
   */
  _checkFailureThreshold(name, state) {
    const recentFailures = (state.rolling.timeoutCount || 0) + (state.rolling.error5xxCount || 0);
    if (recentFailures >= this.maxFailures) {
      state.status = "TEMP_FAIL";
      state.resetAt = new Date(Date.now() + this.tempFailCooldownMs).toISOString();
    }
  }
  /**
   * Increment requests daily usage counter (for AdultMedia dual-cap)
   */
  incrementRequestsDailyUsed(name) {
    const state = this.getProviderState(name);
    state.requestsDailyUsed = (state.requestsDailyUsed || 0) + 1;
    this.inMemoryStates.set(name, state);
  }
  /**
   * Increment objects daily usage counter (for AdultMedia dual-cap)
   */
  incrementObjectsDailyUsed(name, count) {
    const state = this.getProviderState(name);
    state.objectsDailyUsed = (state.objectsDailyUsed || 0) + count;
    this.inMemoryStates.set(name, state);
  }
  /**
   * Set requests daily cap for provider (for AdultMedia dual-cap)
   */
  setRequestsDailyCap(name, cap) {
    const state = this.getProviderState(name);
    state.requestsDailyCap = cap;
    this.inMemoryStates.set(name, state);
  }
  /**
   * Set objects daily cap for provider (for AdultMedia dual-cap)
   */
  setObjectsDailyCap(name, cap) {
    const state = this.getProviderState(name);
    state.objectsDailyCap = cap;
    this.inMemoryStates.set(name, state);
  }
  /**
   * Increment monthly usage counter
   */
  incrementMonthlyUsed(name) {
    const state = this.getProviderState(name);
    state.monthlyUsed = (state.monthlyUsed || 0) + 1;
    this.inMemoryStates.set(name, state);
  }
  /**
   * Set daily cap for provider
   */
  setDailyCap(name, cap) {
    const state = this.getProviderState(name);
    state.dailyCap = cap;
    this.inMemoryStates.set(name, state);
  }
  /**
   * Set monthly cap for provider
   */
  setMonthlyCap(name, cap) {
    const state = this.getProviderState(name);
    state.monthlyCap = cap;
    this.inMemoryStates.set(name, state);
  }
  /**
   * Set last skip reason
   */
  setLastSkipReason(name, reason) {
    const state = this.getProviderState(name);
    state.lastSkipReason = reason;
    this.inMemoryStates.set(name, state);
  }
  /**
   * Get next daily reset time (00:00 America/New_York)
   */
  _getNextDailyReset() {
    const now2 = /* @__PURE__ */ new Date();
    const nextReset = new Date(now2);
    nextReset.setUTCHours(4, 0, 0, 0);
    if (nextReset <= now2) {
      nextReset.setDate(nextReset.getDate() + 1);
    }
    return nextReset.toISOString();
  }
  /**
   * Get next monthly reset time (1st of next month)
   */
  _getNextMonthlyReset() {
    const now2 = /* @__PURE__ */ new Date();
    const nextReset = new Date(now2.getFullYear(), now2.getMonth() + 1, 1);
    return nextReset.toISOString();
  }
};

// src/lib/adapter-registry.js
var AdapterRegistry = class {
  static {
    __name(this, "AdapterRegistry");
  }
  constructor() {
    this.providers = /* @__PURE__ */ new Map();
  }
  /**
   * Register a provider
   */
  register({
    name,
    version,
    type,
    searchFn,
    supportsFreshness = "none",
    defaultWeightByMode = {},
    priority = 0,
    cooldowns = {}
  }) {
    if (!name || !searchFn) {
      throw new Error("Provider name and searchFn are required");
    }
    this.providers.set(name, {
      name,
      version: version || "1.0.0",
      type: type || "api",
      searchFn,
      supportsFreshness,
      defaultWeightByMode,
      priority,
      cooldowns,
      registeredAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  /**
   * Get provider by name
   */
  get(name) {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found in registry`);
    }
    return provider;
  }
  /**
   * List all registered providers
   */
  list() {
    return Array.from(this.providers.values()).map((provider) => ({
      name: provider.name,
      version: provider.version,
      type: provider.type,
      supportsFreshness: provider.supportsFreshness,
      priority: provider.priority,
      defaultWeights: provider.defaultWeightByMode
    }));
  }
  /**
   * Check if provider exists
   */
  has(name) {
    return this.providers.has(name);
  }
  /**
   * Get provider metadata for diagnostics
   */
  getMetadata(name) {
    const provider = this.get(name);
    return {
      name: provider.name,
      version: provider.version,
      type: provider.type,
      supportsFreshness: provider.supportsFreshness,
      priority: provider.priority,
      defaultWeights: provider.defaultWeightByMode,
      registeredAt: provider.registeredAt
    };
  }
  /**
   * Get all metadata for diagnostics
   */
  getAllMetadata() {
    const metadata = {};
    for (const [name] of this.providers) {
      metadata[name] = this.getMetadata(name);
    }
    return metadata;
  }
  /**
   * Get providers by type
   */
  getByType(type) {
    return Array.from(this.providers.values()).filter((provider) => provider.type === type).map((provider) => provider.name);
  }
  /**
   * Get providers sorted by priority (highest first)
   */
  getByPriority() {
    return Array.from(this.providers.values()).sort((a, b) => b.priority - a.priority).map((provider) => provider.name);
  }
};

// src/lib/search-service.js
var SearchService = class {
  static {
    __name(this, "SearchService");
  }
  constructor(env) {
    this.env = env;
    this.ledger = new ProviderLedger(env);
    this.registry = new AdapterRegistry();
    this._initializeProviderCaps();
    this.providers = this._createProviderInstances();
    this.chains = {
      normal: {
        google_slice: ["google", "serpapi", "seznam", "adapters_scrapers_parallel", "apify"],
        adult_slice: ["adultmedia", "qualityporn", "adapters_scrapers_parallel", "apify"],
        adapters_slice: ["adapters_parallel", "apify"],
        scrapers_slice: ["scrapers_parallel", "apify"]
      },
      deep_niche: {
        serper_slice: ["serper", "yandex", "brave", "serphouse", "adapters_scrapers_parallel", "apify"],
        adapters_slice: ["adapters_parallel", "apify"],
        scrapers_slice: ["scrapers_parallel", "apify"],
        adultmedia_slice: ["adultmedia", "qualityporn", "adapters_scrapers_parallel", "apify"],
        qualityporn_slice: ["qualityporn", "adapters_scrapers_parallel", "apify"]
      }
    };
    this.sliceWeights = {
      normal: {
        google_slice: 0.5,
        adult_slice: 0.3,
        adapters_slice: 0.1,
        scrapers_slice: 0.1
      },
      deep_niche: {
        serper_slice: 0.4,
        adapters_slice: 0.15,
        scrapers_slice: 0.15,
        adultmedia_slice: 0.15,
        qualityporn_slice: 0.15
      }
    };
  }
  /**
   * Initialize provider daily/monthly caps
   */
  _initializeProviderCaps() {
    this.ledger.setDailyCap("google", 100);
    this.ledger.setMonthlyCap("google", 3e3);
    this.ledger.setDailyCap("serpapi", 100);
    this.ledger.setMonthlyCap("serpapi", 3e3);
    this.ledger.setDailyCap("seznam", 6);
    this.ledger.setMonthlyCap("seznam", 200);
    this.ledger.setDailyCap("serper", 83);
    this.ledger.setMonthlyCap("serper", 2500);
    this.ledger.setDailyCap("yandex", 3);
    this.ledger.setMonthlyCap("yandex", 100);
    this.ledger.setDailyCap("brave", 66);
    this.ledger.setMonthlyCap("brave", 2e3);
    this.ledger.setDailyCap("serphouse", 13);
    this.ledger.setMonthlyCap("serphouse", 400);
    this.ledger.setDailyCap("adultmedia", 50);
    this.ledger.setMonthlyCap("adultmedia", 1500);
    this.ledger.setRequestsDailyCap("adultmedia", 50);
    this.ledger.setObjectsDailyCap("adultmedia", 1250);
    this.ledger.setDailyCap("qualityporn", 300);
    this.ledger.setMonthlyCap("qualityporn", 9e3);
    this.ledger.setMonthlyCap("apify", 1428);
  }
  /**
   * Create provider instances
   */
  _createProviderInstances() {
    return {
      google: new GoogleProvider(),
      serpapi: new SerpApiProvider(),
      serper: new SerperProvider(),
      yandex: new YandexProvider(),
      brave: new BraveProvider(),
      serphouse: new SerpHouseProvider(),
      adultmedia: new AdultMediaProvider(),
      qualityporn: new QualityPornProvider(),
      apify: new ApifyProvider(),
      scrapers: new ScrapersProvider(),
      adapters: new AdaptersProvider(),
      seznam: new SeznamProvider()
    };
  }
  async search(options) {
    const { query, limit = 10, mode = "normal", debug = false } = options;
    await this.ledger.loadStates();
    try {
      const results = await this.executeSearch(query, { ...options, mode, limit, debug });
      await this.ledger.saveStates();
      return this.formatResults(results, limit, debug);
    } catch (error) {
      console.error("Search service error:", error);
      throw error;
    }
  }
  /**
   * Execute search based on mode
   */
  async executeSearch(query, options) {
    const { mode, limit, debug } = options;
    const sliceWeights = this.sliceWeights[mode] || this.sliceWeights.normal;
    const sliceQuotas = this._calculateSliceQuotas(sliceWeights, limit);
    if (debug) {
      console.log(`Executing ${mode} search with quotas:`, sliceQuotas);
    }
    const slicePromises = Object.entries(sliceQuotas).map(async ([sliceName, quota]) => {
      if (quota === 0) return { slice: sliceName, results: [], requested: 0, delivered: 0, chain: [] };
      return await this.executeSlice(sliceName, query, { ...options, limit: quota });
    });
    const slices = await Promise.all(slicePromises);
    const allResults = [];
    const sliceBreakdown = {};
    for (const slice of slices) {
      allResults.push(...slice.results);
      sliceBreakdown[slice.slice] = {
        requested: slice.requested,
        delivered: slice.delivered,
        chain: slice.chain
      };
    }
    const deduplicated = this.deduplicateResults(allResults);
    return {
      results: deduplicated.slice(0, limit),
      totalUnique: deduplicated.length,
      dedupedCount: allResults.length - deduplicated.length,
      sliceBreakdown,
      mode
    };
  }
  /**
   * Calculate slice quotas
   */
  _calculateSliceQuotas(sliceWeights, totalLimit) {
    const quotas = {};
    let totalAllocated = 0;
    for (const [slice, weight] of Object.entries(sliceWeights)) {
      quotas[slice] = Math.floor(weight * totalLimit);
      totalAllocated += quotas[slice];
    }
    const remainder = totalLimit - totalAllocated;
    const sliceOrder = Object.keys(sliceWeights);
    for (let i = 0; i < remainder; i++) {
      const slice = sliceOrder[i % sliceOrder.length];
      quotas[slice]++;
    }
    return quotas;
  }
  /**
   * Execute a slice using its chain
   */
  async executeSlice(sliceName, query, options) {
    const { limit, debug } = options;
    const chain = this.chains[options.mode][sliceName] || [];
    const results = [];
    const chainLog = [];
    let delivered = 0;
    for (const providerName of chain) {
      if (delivered >= limit) break;
      try {
        const providerResults = await this.executeProviderInChain(providerName, query, {
          ...options,
          limit: limit - delivered
        });
        if (providerResults.length > 0) {
          results.push(...providerResults);
          delivered += providerResults.length;
          chainLog.push({
            provider: providerName,
            added: providerResults.length,
            status: "success"
          });
          if (debug) {
            console.log(`${sliceName}: ${providerName} added ${providerResults.length} results`);
          }
        } else {
          chainLog.push({
            provider: providerName,
            added: 0,
            status: "no_results"
          });
        }
      } catch (error) {
        chainLog.push({
          provider: providerName,
          added: 0,
          status: "error",
          error: error.message
        });
        if (debug) {
          console.log(`${sliceName}: ${providerName} error: ${error.message}`);
        }
      }
    }
    return { slice: sliceName, results, requested: limit, delivered, chain: chainLog };
  }
  /**
   * Execute provider in chain with cap checking
   */
  async executeProviderInChain(providerName, query, options) {
    if (providerName === "adapters_scrapers_parallel") {
      return await this.executeParallel(["adapters", "scrapers"], query, options);
    }
    if (providerName === "adapters_parallel") {
      return await this.executeParallel(["adapters"], query, options);
    }
    if (providerName === "scrapers_parallel") {
      return await this.executeParallel(["scrapers"], query, options);
    }
    if (!this.ledger.isProviderHealthy(providerName)) {
      this.ledger.setLastSkipReason(providerName, "unhealthy");
      return [];
    }
    const state = this.ledger.getProviderState(providerName);
    if (providerName === "adultmedia") {
      if (state.requestsDailyCap && state.requestsDailyUsed >= state.requestsDailyCap) {
        this.ledger.setLastSkipReason(providerName, "requests_daily_cap_exceeded");
        return [];
      }
    } else {
      if (state.dailyCap && state.dailyUsed >= state.dailyCap) {
        this.ledger.setLastSkipReason(providerName, "daily_cap_exceeded");
        return [];
      }
    }
    if (state.monthlyCap && state.monthlyUsed >= state.monthlyCap) {
      this.ledger.setLastSkipReason(providerName, "monthly_cap_exceeded");
      return [];
    }
    const provider = this.providers[providerName];
    if (!provider) return [];
    try {
      const results = await provider.search(query, { ...options, ledger: this.ledger }, this.env);
      if (providerName === "adultmedia") {
        this.ledger.incrementMonthlyUsed(providerName);
      } else if (providerName !== "apify") {
        this.ledger.incrementDailyUsed(providerName);
        this.ledger.incrementMonthlyUsed(providerName);
      } else {
        this.ledger.incrementMonthlyUsed(providerName);
      }
      this.ledger.recordSuccess(providerName);
      return results.map((result) => ({
        ...result,
        source: providerName
      }));
    } catch (error) {
      this.handleProviderError(providerName, error);
      return [];
    }
  }
  /**
   * Execute providers in parallel
   */
  async executeParallel(providerNames, query, options) {
    const promises = providerNames.map(
      (name) => this.executeProviderInChain(name, query, options)
    );
    const resultsArrays = await Promise.all(promises);
    return resultsArrays.flat();
  }
  /**
   * Handle provider errors
   */
  handleProviderError(providerName, error) {
    if (error.message === "QUOTA_EXCEEDED_DAILY") {
      this.ledger.markQuotaExceeded(providerName, this.ledger._getNextDailyReset());
    } else if (error.message === "QUOTA_EXCEEDED_MONTHLY") {
      this.ledger.markQuotaExceeded(providerName);
    } else if (error.message.includes("5") || error.message.includes("timeout")) {
      this.ledger.recordError(providerName, "5xx");
    } else {
      this.ledger.recordError(providerName, "4xx");
    }
  }
  /**
   * Deduplicate results
   */
  deduplicateResults(results) {
    const seen = /* @__PURE__ */ new Set();
    const deduplicated = [];
    for (const result of results) {
      const canonicalUrl = this.canonicalizeUrl(result.url);
      if (!seen.has(canonicalUrl)) {
        seen.add(canonicalUrl);
        deduplicated.push(result);
      }
    }
    return deduplicated;
  }
  /**
   * Canonicalize URL
   */
  canonicalizeUrl(url) {
    try {
      const parsed = new URL(url);
      const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"];
      trackingParams.forEach((param) => parsed.searchParams.delete(param));
      return `${parsed.host}${parsed.pathname}${parsed.search}`.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }
  /**
   * Format final results
   */
  formatResults(searchResult, limit, debug = false) {
    const results = searchResult.results || [];
    const formatted = results.slice(0, limit).map((result) => ({
      title: result.title || "No title",
      url: result.url || "#",
      snippet: result.snippet || "",
      source: result.source || "unknown",
      score: result.score || 0,
      thumbnail: result.thumbnail || null,
      published_at: result.published_at || null,
      author: result.author || null
    }));
    const response = {
      results: formatted,
      query: searchResult.query,
      mode: searchResult.mode,
      timestamp: Date.now(),
      cached: false,
      requestId: crypto.randomUUID(),
      totalUnique: searchResult.totalUnique || formatted.length,
      dedupedCount: searchResult.dedupedCount || 0
    };
    if (debug) {
      response.sliceBreakdown = searchResult.sliceBreakdown;
      response.ledgerState = this.ledger.getDiagnostics();
    }
    return response;
  }
};

// src/lib/validation.js
function sanitizeString(input) {
  if (typeof input !== "string") return "";
  return input.trim().replace(/[<>\"'&]/g, "").replace(/[\x00-\x1F\x7F]/g, "").substring(0, 500);
}
__name(sanitizeString, "sanitizeString");
function validateQuery(query) {
  if (!query || typeof query !== "string") {
    return { isValid: false, value: "", error: "Query parameter is required" };
  }
  const sanitized = sanitizeString(query);
  if (sanitized.length === 0) {
    return { isValid: false, value: "", error: "Query cannot be empty after sanitization" };
  }
  if (sanitized.length < 2) {
    return { isValid: false, value: "", error: "Query must be at least 2 characters long" };
  }
  if (sanitized.length > 200) {
    return { isValid: false, value: "", error: "Query cannot exceed 200 characters" };
  }
  return { isValid: true, value: sanitized };
}
__name(validateQuery, "validateQuery");
function validateMode(mode) {
  const allowedModes = ["normal", "deep_niche"];
  const sanitized = sanitizeString(mode || "normal");
  if (sanitized === "niche") {
    return { isValid: true, value: "normal" };
  }
  if (!allowedModes.includes(sanitized)) {
    return { isValid: true, value: "normal" };
  }
  return { isValid: true, value: sanitized };
}
__name(validateMode, "validateMode");
function validateFresh(fresh) {
  const allowedFresh = ["d1", "d7", "d30", "d365", "all"];
  const sanitized = sanitizeString(fresh || "d7");
  if (!allowedFresh.includes(sanitized)) {
    return { isValid: true, value: "d7" };
  }
  return { isValid: true, value: sanitized };
}
__name(validateFresh, "validateFresh");
function validateLimit(limit, env) {
  const maxLimit = parseInt(env.MAX_LIMIT) || 20;
  const minLimit = parseInt(env.MIN_LIMIT) || 3;
  const defaultLimit = parseInt(env.DEFAULT_LIMIT) || 10;
  let numLimit = defaultLimit;
  if (typeof limit === "string") {
    numLimit = parseInt(limit, 10);
  } else if (typeof limit === "number") {
    numLimit = limit;
  }
  if (isNaN(numLimit)) {
    return { isValid: true, value: defaultLimit };
  }
  if (numLimit < minLimit) {
    return { isValid: true, value: minLimit };
  }
  if (numLimit > maxLimit) {
    return { isValid: true, value: maxLimit };
  }
  return { isValid: true, value: numLimit };
}
__name(validateLimit, "validateLimit");
function validateProvider(provider) {
  const allowedProviders = ["google", "brave", "yandex", "adultmedia"];
  const sanitized = sanitizeString(provider || "");
  if (sanitized && !allowedProviders.includes(sanitized)) {
    return { isValid: true, value: "" };
  }
  return { isValid: true, value: sanitized };
}
__name(validateProvider, "validateProvider");
function validateHostMode(hostMode) {
  const allowedModes = ["normal", "strict", "permissive"];
  const sanitized = sanitizeString(hostMode || "normal");
  if (!allowedModes.includes(sanitized)) {
    return { isValid: true, value: "normal" };
  }
  return { isValid: true, value: sanitized };
}
__name(validateHostMode, "validateHostMode");
function validateBoolean(param, defaultValue = true) {
  if (typeof param === "string") {
    const lower = param.toLowerCase();
    if (lower === "false" || lower === "0" || lower === "no") {
      return false;
    }
    if (lower === "true" || lower === "1" || lower === "yes") {
      return true;
    }
  }
  return defaultValue;
}
__name(validateBoolean, "validateBoolean");
function validateSite(site) {
  if (!site) return { isValid: true, value: "" };
  const sanitized = sanitizeString(site);
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!domainRegex.test(sanitized)) {
    return { isValid: false, value: "", error: "Invalid domain format" };
  }
  return { isValid: true, value: sanitized };
}
__name(validateSite, "validateSite");
function validateAllInputs(params, env) {
  const errors = [];
  const data = {};
  const queryValidation = validateQuery(params.get("q"));
  if (!queryValidation.isValid) {
    errors.push(queryValidation.error);
  }
  data.query = queryValidation.value;
  data.mode = validateMode(params.get("mode")).value;
  data.fresh = validateFresh(params.get("fresh")).value;
  data.limit = validateLimit(params.get("limit"), env).value;
  data.provider = validateProvider(params.get("provider")).value;
  data.hostMode = validateHostMode(params.get("hostMode")).value;
  const siteValidation = validateSite(params.get("site"));
  if (!siteValidation.isValid) {
    errors.push(siteValidation.error);
  }
  data.site = siteValidation.value;
  data.showThumbs = validateBoolean(params.get("showThumbs"), true);
  data.safeMode = validateBoolean(params.get("safeMode"), true);
  data.debug = validateBoolean(params.get("debug"), false);
  data.duration = sanitizeString(params.get("duration") || "");
  data.durationMode = sanitizeString(params.get("durationMode") || "normal");
  return {
    isValid: errors.length === 0,
    data,
    errors
  };
}
__name(validateAllInputs, "validateAllInputs");

// src/lib/response.js
function createCompressedResponse(data, options = {}) {
  const {
    status = 200,
    headers = {},
    compress = true
  } = options;
  const jsonString = typeof data === "string" ? data : JSON.stringify(data);
  const responseHeaders = {
    "Content-Type": "application/json",
    "X-Content-Encoding": "gzip",
    "X-Compressed-By": "Jack-Portal",
    ...headers
  };
  if (compress) {
    responseHeaders["Content-Encoding"] = "gzip";
    responseHeaders["Vary"] = "Accept-Encoding";
  }
  return new Response(jsonString, {
    status,
    headers: responseHeaders
  });
}
__name(createCompressedResponse, "createCompressedResponse");
function createCORSResponse(data, options = {}) {
  const {
    status = 200,
    headers = {},
    origin = "*",
    methods = "GET, POST, OPTIONS",
    credentials = false
  } = options;
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    // 24 hours
    ...headers
  };
  if (credentials) {
    corsHeaders["Access-Control-Allow-Credentials"] = "true";
  }
  return createCompressedResponse(data, {
    ...options,
    status,
    headers: corsHeaders
  });
}
__name(createCORSResponse, "createCORSResponse");
function createErrorResponse(message, status = 500, details = {}) {
  const errorData = {
    error: message,
    status,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    requestId: crypto.randomUUID(),
    ...details
  };
  return createCORSResponse(errorData, {
    status,
    headers: {
      "X-Error-Type": details.type || "ApplicationError",
      "X-Request-ID": errorData.requestId
    }
  });
}
__name(createErrorResponse, "createErrorResponse");
function createSuccessResponse(data, metadata = {}) {
  const responseData = {
    ...data,
    metadata: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      requestId: crypto.randomUUID(),
      ...metadata
    }
  };
  return createCORSResponse(responseData, {
    headers: {
      "X-Request-ID": responseData.metadata.requestId,
      "X-Response-Type": "Success"
    }
  });
}
__name(createSuccessResponse, "createSuccessResponse");
function handleOptionsRequest(request) {
  const origin = request.headers.get("Origin") || "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
      "X-Preflight-Allowed": "true"
    }
  });
}
__name(handleOptionsRequest, "handleOptionsRequest");

// src/lib/rate-limit.js
var RATE_LIMITS = {
  // Per IP limits
  ip: {
    window: 60,
    // 1 minute
    maxRequests: 10
    // 10 requests per minute
  },
  // Per endpoint limits
  endpoint: {
    window: 60,
    maxRequests: 30
  },
  // Global limits
  global: {
    window: 60,
    maxRequests: 100
  }
};
function generateRateLimitKey(type, identifier) {
  return `ratelimit:${type}:${identifier}:${Math.floor(Date.now() / (RATE_LIMITS[type].window * 1e3))}`;
}
__name(generateRateLimitKey, "generateRateLimitKey");
async function checkRateLimit(env, ip, endpoint = "search") {
  try {
    const now2 = Date.now();
    const results = await Promise.all([
      // Check IP-based rate limit
      checkSpecificRateLimit(env, "ip", ip),
      // Check endpoint-based rate limit
      checkSpecificRateLimit(env, "endpoint", endpoint),
      // Check global rate limit
      checkSpecificRateLimit(env, "global", "global")
    ]);
    const ipResult = results[0];
    const endpointResult = results[1];
    const globalResult = results[2];
    if (!ipResult.allowed || !endpointResult.allowed || !globalResult.allowed) {
      return {
        allowed: false,
        remaining: Math.min(ipResult.remaining, endpointResult.remaining, globalResult.remaining),
        resetTime: Math.max(ipResult.resetTime, endpointResult.resetTime, globalResult.resetTime),
        exceeded: {
          ip: !ipResult.allowed,
          endpoint: !endpointResult.allowed,
          global: !globalResult.allowed
        }
      };
    }
    return {
      allowed: true,
      remaining: Math.min(ipResult.remaining, endpointResult.remaining, globalResult.remaining),
      resetTime: Math.min(ipResult.resetTime, endpointResult.resetTime, globalResult.resetTime)
    };
  } catch (error) {
    console.warn("Rate limit check error:", error);
    return {
      allowed: true,
      remaining: 999,
      resetTime: now + 6e4
    };
  }
}
__name(checkRateLimit, "checkRateLimit");
async function checkSpecificRateLimit(env, type, identifier) {
  const key = generateRateLimitKey(type, identifier);
  const config = RATE_LIMITS[type];
  const now2 = Date.now();
  const windowStart = Math.floor(now2 / (config.window * 1e3)) * (config.window * 1e3);
  const resetTime = windowStart + config.window * 1e3;
  try {
    const currentCount = parseInt(await env.CACHE.get(key)) || 0;
    if (currentCount >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime
      };
    }
    const newCount = currentCount + 1;
    await env.CACHE.put(key, newCount.toString(), {
      expirationTtl: config.window
    });
    return {
      allowed: true,
      remaining: config.maxRequests - newCount,
      resetTime
    };
  } catch (error) {
    console.warn(`Rate limit error for ${type}:${identifier}:`, error);
    return {
      allowed: true,
      remaining: 999,
      resetTime: now2 + 6e4
    };
  }
}
__name(checkSpecificRateLimit, "checkSpecificRateLimit");
function createRateLimitResponse(rateLimitInfo) {
  const resetDate = new Date(rateLimitInfo.resetTime);
  return new Response(JSON.stringify({
    error: "Rate limit exceeded",
    message: "Too many requests. Please try again later.",
    retryAfter: Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1e3),
    resetTime: resetDate.toISOString(),
    limits: rateLimitInfo.exceeded,
    status: 429
  }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "X-Rate-Limit-Remaining": rateLimitInfo.remaining.toString(),
      "X-Rate-Limit-Reset": resetDate.toISOString(),
      "X-Rate-Limit-Retry-After": Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1e3).toString(),
      "Retry-After": Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1e3).toString()
    }
  });
}
__name(createRateLimitResponse, "createRateLimitResponse");

// src/handlers/aggregate.js
async function handleAggregate(request, env) {
  const url = new URL(request.url);
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || request.headers.get("X-Real-IP") || "unknown";
  const rateLimitResult = await checkRateLimit(env, ip, "aggregate");
  if (!rateLimitResult.allowed) {
    console.warn("Rate limit exceeded for IP:", ip);
    return createRateLimitResponse(rateLimitResult);
  }
  const validation = validateAllInputs(url.searchParams, env);
  if (!validation.isValid) {
    console.warn("Input validation failed:", validation.errors);
    return createErrorResponse(
      "Invalid input parameters",
      400,
      {
        details: validation.errors,
        type: "ValidationError"
      }
    );
  }
  const {
    query,
    mode,
    fresh,
    limit,
    duration,
    site,
    hostMode,
    durationMode,
    showThumbs,
    provider,
    safeMode,
    debug
  } = validation.data;
  const cacheKey = `search:${query}:${mode}:${fresh}:${limit}:${provider || "all"}:${safeMode}:${debug || false}`;
  try {
    const cachedResult = await env.CACHE.get(cacheKey);
    if (cachedResult) {
      console.log("Cache hit for query:", query, "from IP:", ip);
      const cachedData = JSON.parse(cachedResult);
      return createSuccessResponse(cachedData, {
        cacheStatus: "HIT",
        validationStatus: "PASSED"
      });
    }
  } catch (cacheError) {
    console.warn("Cache read error for query:", query, "Error:", cacheError.message);
  }
  console.log("Cache miss for query:", query, "from IP:", ip);
  try {
    const searchService = new SearchService(env);
    const results = await searchService.search({
      query,
      mode,
      fresh,
      limit,
      duration,
      site,
      hostMode,
      durationMode,
      showThumbs,
      provider,
      safeMode,
      debug,
      ip
    });
    const response = {
      results,
      query,
      mode,
      timestamp: Date.now(),
      cached: false,
      requestId: crypto.randomUUID(),
      totalUnique: results.totalUnique,
      dedupedCount: results.dedupedCount,
      ...debug && results.providerBreakdown && { providerBreakdown: results.providerBreakdown },
      ...debug && results.ledgerState && { ledgerState: results.ledgerState }
    };
    try {
      await env.CACHE.put(cacheKey, JSON.stringify(response), {
        expirationTtl: 1800
        // 30 minutes
      });
      console.log("Cached result for query:", query, "TTL: 1800s");
    } catch (cacheWriteError) {
      console.warn("Cache write error for query:", query, "Error:", cacheWriteError.message);
    }
    return createSuccessResponse(response, {
      cacheStatus: "MISS",
      validationStatus: "PASSED"
    });
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error("Search error:", {
      requestId,
      query,
      ip,
      mode,
      provider,
      error: error.message,
      stack: error.stack,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return createErrorResponse(
      "Search failed",
      500,
      {
        message: error.message,
        type: error.name || "SearchError",
        requestId
      }
    );
  }
}
__name(handleAggregate, "handleAggregate");

// src/handlers/diagnostics.js
async function handleDiagnostics(request, env) {
  try {
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider");
    const ledger = new ProviderLedger(env);
    await ledger.loadStates();
    const registry = new AdapterRegistry();
    let diagnostics;
    if (provider) {
      diagnostics = {
        provider: ledger.getProviderState(provider),
        registry: registry.getMetadata(provider),
        ledger_state: ledger.getDiagnostics(provider)
      };
    } else {
      diagnostics = {
        providers: ledger.getDiagnostics(),
        registry: registry.getAllMetadata(),
        system: {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          version: "2.1.0",
          environment: env.ENVIRONMENT || "development"
        },
        cache: {
          status: env.CACHE ? "available" : "unavailable"
        },
        provider_ledger: {
          status: env.PROVIDER_LEDGER ? "available" : "unavailable"
        },
        alerts: _computeAlertFlags(ledger.getDiagnostics())
      };
    }
    return createSuccessResponse(diagnostics, {
      cacheStatus: "BYPASS"
    });
  } catch (error) {
    console.error("Diagnostics error:", error);
    return createSuccessResponse({
      error: "Diagnostics unavailable",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }, {
      cacheStatus: "BYPASS"
    });
  }
}
__name(handleDiagnostics, "handleDiagnostics");
function _computeAlertFlags(providerStates) {
  const now2 = Date.now();
  const tenMinutesAgo = now2 - 10 * 60 * 1e3;
  const googleState = providerStates.google;
  const googleQuotaStale = googleState && googleState.status === "QUOTA_EXCEEDED" && googleState.resetAt && now2 > new Date(googleState.resetAt).getTime();
  let totalRequests = 0;
  let fallbackRequests = 0;
  for (const [providerName, state] of Object.entries(providerStates)) {
    if (providerName === "google") continue;
    const providerRequests = (state.rolling?.successCount || 0) + (state.rolling?.timeoutCount || 0) + (state.rolling?.error4xxCount || 0) + (state.rolling?.error5xxCount || 0);
    totalRequests += providerRequests;
    if (providerName !== "google") {
      fallbackRequests += providerRequests;
    }
  }
  const fallbackRate = totalRequests > 0 ? fallbackRequests / totalRequests * 100 : 0;
  const fallbackRateHigh = fallbackRate > 15;
  return {
    google_quota_stale: googleQuotaStale || false,
    fallback_rate_high: fallbackRateHigh,
    fallback_rate_percent: fallbackRate.toFixed(1),
    last_checked: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(_computeAlertFlags, "_computeAlertFlags");

// src/lib/logger.js
var LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};
var currentLogLevel = LOG_LEVELS.INFO;
function initLogLevel(env) {
  if (env.LOG_LEVEL) {
    const envLogLevel = parseInt(env.LOG_LEVEL);
    if (!isNaN(envLogLevel) && envLogLevel >= 0 && envLogLevel <= 3) {
      currentLogLevel = envLogLevel;
    }
  }
}
__name(initLogLevel, "initLogLevel");
function formatLogEntry(level, message, data = {}) {
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    level,
    message,
    ...data,
    service: "jack-portal",
    version: "2.0.0"
  };
}
__name(formatLogEntry, "formatLogEntry");
function logError(message, data = {}) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    const logEntry = formatLogEntry("ERROR", message, data);
    console.error(JSON.stringify(logEntry));
  }
}
__name(logError, "logError");
function logInfo(message, data = {}) {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    const logEntry = formatLogEntry("INFO", message, data);
    console.log(JSON.stringify(logEntry));
  }
}
__name(logInfo, "logInfo");
function logRequestStart(context) {
  logInfo("Request started", {
    type: "request_start",
    ...context
  });
}
__name(logRequestStart, "logRequestStart");
function logRequestEnd(context, duration, status) {
  logInfo("Request completed", {
    type: "request_end",
    duration,
    status,
    ...context
  });
}
__name(logRequestEnd, "logRequestEnd");

// src/worker.js
var worker_default = {
  /**
   * Fetch handler for all incoming requests
   * @param {Request} request - The incoming HTTP request
   * @param {Object} env - Environment variables and bindings
   * @param {Object} ctx - Execution context
   * @returns {Promise<Response>} The HTTP response
   */
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    const method = request.method;
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || request.headers.get("X-Real-IP") || "unknown";
    initLogLevel(env);
    logRequestStart({
      requestId,
      method,
      path: url.pathname,
      ip,
      userAgent: request.headers.get("User-Agent")?.substring(0, 100)
    });
    try {
      if (method === "OPTIONS") {
        const response = handleOptionsRequest(request);
        logRequestEnd({
          requestId,
          method,
          path: url.pathname,
          ip
        }, Date.now() - startTime, response.status);
        return response;
      }
      if (url.pathname === "/api/search") {
        const response = await handleAggregate(request, env);
        const newResponse = new Response(response.body, response);
        newResponse.headers.set("X-Request-ID", requestId);
        newResponse.headers.set("X-Response-Time", `${Date.now() - startTime}ms`);
        newResponse.headers.set("X-Powered-By", "Jack-Portal/2.0.0");
        logRequestEnd({
          requestId,
          method,
          path: url.pathname,
          ip
        }, Date.now() - startTime, newResponse.status);
        return newResponse;
      }
      if (url.pathname === "/api/diagnostics" && url.searchParams.get("debug") === "true") {
        const response = await handleDiagnostics(request, env);
        logRequestEnd({
          requestId,
          method,
          path: url.pathname,
          ip
        }, Date.now() - startTime, response.status);
        return response;
      }
      const htmlResponse = new Response("Hello World", {
        headers: {
          "Content-Type": "text/plain",
          "X-Request-ID": requestId,
          "X-Response-Time": `${Date.now() - startTime}ms`,
          "Cache-Control": "public, max-age=300"
          // Cache HTML for 5 minutes
        }
      });
      logRequestEnd({
        requestId,
        method,
        path: url.pathname,
        ip
      }, Date.now() - startTime, htmlResponse.status);
      return htmlResponse;
    } catch (error) {
      logError("Worker error", {
        requestId,
        method,
        path: url.pathname,
        ip,
        error: error.message,
        stack: error.stack,
        responseTime: Date.now() - startTime
      });
      const errorResponse = createErrorResponse(
        "Internal server error",
        500,
        {
          requestId,
          type: "WorkerError"
        }
      );
      logRequestEnd({
        requestId,
        method,
        path: url.pathname,
        ip
      }, Date.now() - startTime, errorResponse.status);
      return errorResponse;
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-lRWrxK/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-lRWrxK/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
/**
 * Jack Portal - Cloudflare Worker
 * Multi-provider search API with intelligent caching
 *
 * @version 2.0.0
 * @author Jack Portal Team
 * @license MIT
 */
//# sourceMappingURL=worker.js.map
