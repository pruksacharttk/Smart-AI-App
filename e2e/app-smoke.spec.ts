import { expect, test } from "@playwright/test";

function hasProviderKey(provider: string, hasApiKey: boolean | Record<string, boolean>) {
  return typeof hasApiKey === "boolean" ? hasApiKey : Boolean(hasApiKey[provider]);
}

function publicConfig(hasApiKey: boolean | Record<string, boolean> = false) {
  return {
    providers: {
      nvidia: { apiKey: "", baseUrl: "https://integrate.api.nvidia.com/v1", hasApiKey: hasProviderKey("nvidia", hasApiKey) },
      openrouter: { apiKey: "", baseUrl: "https://openrouter.ai/api/v1", hasApiKey: hasProviderKey("openrouter", hasApiKey) },
      fal: { apiKey: "", baseUrl: "https://fal.run", hasApiKey: hasProviderKey("fal", hasApiKey) },
      kie: { apiKey: "", baseUrl: "https://api.kie.ai", hasApiKey: hasProviderKey("kie", hasApiKey) },
      wavespeed: { apiKey: "", baseUrl: "https://api.wavespeed.ai", hasApiKey: hasProviderKey("wavespeed", hasApiKey) }
    },
    fallback: [
      { provider: "openrouter", model: "qwen/qwen3-vl-32b-instruct", customModel: "" },
      { provider: "openrouter", model: "qwen/qwen3-vl-8b-instruct", customModel: "" },
      { provider: "openrouter", model: "qwen/qwen3-vl-235b-a22b-instruct", customModel: "" },
      { provider: "openrouter", model: "qwen/qwen3.5-35b-a3b", customModel: "" }
    ]
  };
}

async function routeConfig(page, hasApiKey: boolean | Record<string, boolean> = false) {
  const posts: unknown[] = [];
  await page.route("**/api/config/reveal", async (route) => {
    const request = route.request();
    const provider = request.postDataJSON()?.provider || "openrouter";
    await route.fulfill({ json: { provider, apiKey: provider === "openrouter" ? "sk-or-revealed-secret" : `${provider}-revealed-secret` } });
  });
  await page.route("**/api/config", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      await route.fulfill({ json: { config: publicConfig(hasApiKey) } });
      return;
    }
    if (request.method() === "POST") {
      posts.push(request.postDataJSON());
      await route.fulfill({ json: { config: publicConfig(true) } });
      return;
    }
    await route.fallback();
  });
  return posts;
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth
  }));
  expect(Math.max(overflow.documentWidth, overflow.bodyWidth)).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}

test("app loads skills, config, and secret-safe API responses", async ({ page, request }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Smart AI App" })).toBeVisible();
  await page.getByRole("button", { name: "Run Skill" }).click();

  const skillSelect = page.getByLabel("Skill", { exact: true });
  await expect(skillSelect).toBeVisible();
  await expect.poll(async () => skillSelect.locator("option").count()).toBeGreaterThan(0);
  await expect(page.locator(".page-head").getByRole("button", { name: "Run Skill" })).toBeVisible();

  await page.getByRole("button", { name: "Config" }).click();
  await expect(page.getByRole("heading", { name: "Config" })).toBeVisible();
  for (const provider of ["NVIDIA NIM", "OpenRouter", "fal.ai", "Kie.ai", "WaveSpeedAI"]) {
    await expect(page.getByRole("heading", { name: provider })).toBeVisible();
  }
  await expect(page.getByText("Recommended Qwen vision fallback models")).toBeVisible();

  await page.getByRole("button", { name: "Run Skill" }).click();
  await expect(page.getByText("Recommended Qwen vision fallback models")).toHaveCount(0);

  const configResponse = await request.get("/api/config");
  expect(configResponse.status()).toBe(200);
  const body = await configResponse.json();
  expect(JSON.stringify(body)).not.toContain("sk-or-secret");
  for (const provider of Object.values(body.config.providers as Record<string, { apiKey?: string }>)) {
    expect(provider.apiKey || "").toBe("");
  }

  expect(consoleErrors.filter((line) => line.includes("ReferenceError"))).toEqual([]);
});

test("mobile layout fits dashboard, run skill, and config pages without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Smart AI App" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator(".side-nav").getByRole("button", { name: "Run Skill" }).click();
  await expect(page.getByRole("heading", { name: "Run Skill" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator(".side-nav").getByRole("button", { name: "Config" }).click();
  await expect(page.getByRole("heading", { name: "Config" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator(".side-nav").getByRole("button", { name: "Dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("config show button reveals a saved encrypted key on explicit confirmation", async ({ page }) => {
  await routeConfig(page, { openrouter: true });
  await page.goto("/");
  await page.getByRole("button", { name: "Config" }).click();
  const openrouterCard = page.locator(".provider-card").filter({ hasText: "OpenRouter" });
  await expect(openrouterCard.getByLabel("API key")).toHaveValue("");
  page.once("dialog", (dialog) => dialog.accept());
  await openrouterCard.getByRole("button", { name: "Show" }).click();
  await expect(openrouterCard.getByLabel("API key")).toHaveValue("sk-or-revealed-secret");
  await openrouterCard.getByRole("button", { name: "Hide" }).click();
  await expect(openrouterCard.getByLabel("API key")).toHaveValue("");
});

test("legacy localStorage config migrates once and sanitizes API keys", async ({ page }) => {
  const posts = await routeConfig(page, false);
  await page.goto("/", {
    waitUntil: "commit"
  });
  await page.evaluate(() => {
    localStorage.setItem("llmConfig", JSON.stringify({
      providers: {
        openrouter: { apiKey: "sk-or-legacy-secret", baseUrl: "https://openrouter.ai/api/v1" }
      },
      fallback: [{ provider: "openrouter", model: "qwen/qwen3-vl-32b-instruct", customModel: "" }]
    }));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Smart AI App" })).toBeVisible();
  await expect.poll(() => posts.length).toBe(1);
  const legacy = await page.evaluate(() => ({
    raw: localStorage.getItem("llmConfig") || "",
    marker: localStorage.getItem("llmConfigDbMigrationCompleted")
  }));
  expect(legacy.raw).not.toContain("sk-or-legacy-secret");
  expect(legacy.marker).toBe("true");
});

test("legacy migration fills only providers missing from database keys", async ({ page }) => {
  const posts = await routeConfig(page, { nvidia: true, openrouter: true });
  await page.goto("/", { waitUntil: "commit" });
  await page.evaluate(() => {
    localStorage.setItem("llmConfigDbMigrationCompleted", "true");
    localStorage.setItem("llmConfig", JSON.stringify({
      providers: {
        nvidia: { apiKey: "nvapi-should-not-overwrite", baseUrl: "https://integrate.api.nvidia.com/v1" },
        openrouter: { apiKey: "sk-or-should-not-overwrite", baseUrl: "https://openrouter.ai/api/v1" },
        fal: { apiKey: "fal-legacy-secret", baseUrl: "https://fal.run" },
        kie: { apiKey: "kie-legacy-secret", baseUrl: "https://api.kie.ai" },
        wavespeed: { apiKey: "wavespeed-legacy-secret", baseUrl: "https://api.wavespeed.ai" }
      }
    }));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Smart AI App" })).toBeVisible();
  await expect.poll(() => posts.length).toBe(1);
  expect(JSON.stringify(posts[0])).not.toContain("nvapi-should-not-overwrite");
  expect(JSON.stringify(posts[0])).not.toContain("sk-or-should-not-overwrite");
  expect(JSON.stringify(posts[0])).toContain("fal-legacy-secret");
  expect(JSON.stringify(posts[0])).toContain("kie-legacy-secret");
  expect(JSON.stringify(posts[0])).toContain("wavespeed-legacy-secret");
  const state = await page.evaluate(() => ({
    raw: localStorage.getItem("llmConfig") || "",
    markerV3: localStorage.getItem("llmConfigDbMigrationV3Completed")
  }));
  expect(state.raw).not.toContain("fal-legacy-secret");
  expect(state.raw).not.toContain("kie-legacy-secret");
  expect(state.raw).not.toContain("wavespeed-legacy-secret");
  expect(state.markerV3).toBe("true");
});

test("legacy migration imports standalone provider key storage entries", async ({ page }) => {
  const posts = await routeConfig(page, false);
  await page.goto("/", { waitUntil: "commit" });
  await page.evaluate(() => {
    localStorage.setItem("falApiKey", "fal-standalone-secret");
    localStorage.setItem("kieKey", "kie-standalone-secret");
    localStorage.setItem("wavespeedApiKey", "wavespeed-standalone-secret");
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Smart AI App" })).toBeVisible();
  await expect.poll(() => posts.length).toBe(1);
  expect(JSON.stringify(posts[0])).toContain("fal-standalone-secret");
  expect(JSON.stringify(posts[0])).toContain("kie-standalone-secret");
  expect(JSON.stringify(posts[0])).toContain("wavespeed-standalone-secret");
  expect(await page.evaluate(() => localStorage.getItem("falApiKey"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("kieKey"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("wavespeedApiKey"))).toBeNull();
});

test("legacy migration imports nested legacy config formats even after V2 marker", async ({ page }) => {
  const posts = await routeConfig(page, false);
  await page.goto("/", { waitUntil: "commit" });
  await page.evaluate(() => {
    localStorage.setItem("llmConfigDbMigrationCompleted", "true");
    localStorage.setItem("llmConfigDbMigrationV2Completed", "true");
    localStorage.setItem("appConfig", JSON.stringify({
      apiKeys: {
        falAi: "fal-nested-secret",
        kie: { token: "kie-nested-secret" },
        waveSpeedAiApiKey: "wavespeed-nested-secret"
      }
    }));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Smart AI App" })).toBeVisible();
  await expect.poll(() => posts.length).toBe(1);
  expect(JSON.stringify(posts[0])).toContain("fal-nested-secret");
  expect(JSON.stringify(posts[0])).toContain("kie-nested-secret");
  expect(JSON.stringify(posts[0])).toContain("wavespeed-nested-secret");
  const state = await page.evaluate(() => ({
    raw: localStorage.getItem("appConfig") || "",
    markerV3: localStorage.getItem("llmConfigDbMigrationV3Completed")
  }));
  expect(state.raw).not.toContain("fal-nested-secret");
  expect(state.raw).not.toContain("kie-nested-secret");
  expect(state.raw).not.toContain("wavespeed-nested-secret");
  expect(state.markerV3).toBe("true");
});

test("legacy migration V3 marker blocks repeat migration and still sanitizes", async ({ page }) => {
  const posts = await routeConfig(page, false);
  await page.goto("/", { waitUntil: "commit" });
  await page.evaluate(() => {
    localStorage.setItem("llmConfigDbMigrationCompleted", "true");
    localStorage.setItem("llmConfigDbMigrationV2Completed", "true");
    localStorage.setItem("llmConfigDbMigrationV3Completed", "true");
    localStorage.setItem("llmConfig", JSON.stringify({
      providers: {
        openrouter: { apiKey: "sk-or-should-not-migrate", baseUrl: "https://openrouter.ai/api/v1" }
      }
    }));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Smart AI App" })).toBeVisible();
  await page.waitForTimeout(250);
  expect(posts.length).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem("llmConfig"))).not.toContain("sk-or-should-not-migrate");
});

test("legacy migration does not overwrite saved database keys", async ({ page }) => {
  const posts = await routeConfig(page, true);
  await page.goto("/", { waitUntil: "commit" });
  await page.evaluate(() => {
    localStorage.setItem("llmConfig", JSON.stringify({
      providers: {
        openrouter: { apiKey: "sk-or-browser-key", baseUrl: "https://openrouter.ai/api/v1" }
      }
    }));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Smart AI App" })).toBeVisible();
  await page.waitForTimeout(250);
  expect(posts.length).toBe(0);
  const state = await page.evaluate(() => ({
    raw: localStorage.getItem("llmConfig") || "",
    marker: localStorage.getItem("llmConfigDbMigrationCompleted")
  }));
  expect(state.raw).not.toContain("sk-or-browser-key");
  expect(state.marker).toBe("true");
});
