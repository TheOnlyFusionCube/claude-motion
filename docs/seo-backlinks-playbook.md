# claude-motion: Google Indexing & Backlink Execution Playbook

This playbook contains actionable steps, exact URLs, and copy-paste submission templates to index `claude-motion` on Google and build high-authority developer backlinks.

---

## Part 1: Instant Google Indexing (Google Search Console)

The GitHub Pages site is live at:
👉 **`https://theonlyfusioncube.github.io/claude-motion/`**
- Sitemap: `https://theonlyfusioncube.github.io/claude-motion/sitemap.xml`
- Robots: `https://theonlyfusioncube.github.io/claude-motion/robots.txt`

### Step 1: Add Property in Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console).
2. Click **Add Property** in the left sidebar dropdown.
3. Select **URL prefix** (right option) and enter:
   `https://theonlyfusioncube.github.io/claude-motion/`
4. Click **Continue**.

### Step 2: Verification (HTML Tag Method)
If asked to verify ownership:
1. Select **HTML tag** under "Other verification methods".
2. Copy the meta tag: `<meta name="google-site-verification" content="YOUR_TOKEN" />`.
3. Add it to the `<head>` of `index.html` on the `gh-pages` branch, commit and push.
4. Click **Verify** in Search Console.

### Step 3: Submit Sitemap
1. In Search Console, navigate to **Indexing** > **Sitemaps**.
2. Under "Add a new sitemap", enter:
   `sitemap.xml`
3. Click **Submit**. Googlebot will process the URL and discover all links.

### Step 4: Force Immediate URL Inspection
1. Paste `https://theonlyfusioncube.github.io/claude-motion/` into the top search bar ("Inspect any URL in...").
2. Click **Request Indexing**.
3. Googlebot will prioritize crawling the URL within a few hours.

---

## Part 2: High-Authority Backlink Acquisition (Domain Authority 85–96)

### 1. GitHub "Awesome" Lists (DA 96)
GitHub has a Domain Authority of 96. Getting listed in popular curated lists provides permanent, authoritative backlinks and targeted developer traffic.

#### Target A: `awesome-creative-coding` (`terkelg/awesome-creative-coding`)
- **Repo**: [https://github.com/terkelg/awesome-creative-coding](https://github.com/terkelg/awesome-creative-coding)
- **Target Section**: `### Web / JavaScript` or `### Physics`
- **Markdown Snippet**:
  ```markdown
  - [claude-motion](https://github.com/TheOnlyFusionCube/claude-motion) - High-performance 2D/3D motion graphics and deterministic physics engine for browser animation and video rendering.
  ```
- **PR Title**: `Add claude-motion to JavaScript motion/physics section`

#### Target B: `awesome-canvas` (`ericdrowell/awesome-canvas`)
- **Repo**: [https://github.com/ericdrowell/awesome-canvas](https://github.com/ericdrowell/awesome-canvas)
- **Target Section**: `## Libraries / Animation`
- **Markdown Snippet**:
  ```markdown
  - [claude-motion](https://github.com/TheOnlyFusionCube/claude-motion) - Deterministic 60 FPS Canvas and WebGL motion graphics runtime with headless video export.
  ```
- **PR Title**: `Add claude-motion to Animation libraries`

#### Target C: `awesome-claude` / `awesome-claude-prompts`
- **Target Section**: `## Skills & Extensions` or `## Tools`
- **Markdown Snippet**:
  ```markdown
  - [claude-motion](https://github.com/TheOnlyFusionCube/claude-motion) - Claude Code agent skill for generating deterministic 60 FPS motion graphics, Three.js scenes, and video exports.
  ```

---

### 2. High-DA Developer Blogging (Dev.to & Hashnode) (DA 90+)
Search engines reward original articles that specify a `canonical_url` to your site. This passes link juice directly to `theonlyfusioncube.github.io/claude-motion/`.

- **Ready Article**: [`docs/launch-article.md`](file:///Users/faye/claude-motion/docs/launch-article.md)
- **Publish on Dev.to**:
  1. Go to [dev.to/new](https://dev.to/new).
  2. Paste the contents of `docs/launch-article.md`.
  3. Ensure frontmatter includes:
     ```yaml
     canonical_url: https://theonlyfusioncube.github.io/claude-motion/
     ```
  4. Click **Publish**.
- **Publish on Hashnode**:
  1. Open Hashnode story editor.
  2. In story settings, expand **Advanced Settings** > **Canonical URL**.
  3. Enter `https://theonlyfusioncube.github.io/claude-motion/`.
  4. Publish.

---

### 3. Community Launch Submissions (High Referral Traffic)

#### Hacker News (Show HN)
- **Submit URL**: `https://news.ycombinator.com/submit`
- **Title**: `Show HN: claude-motion – Deterministic 60 FPS motion graphics and video renderer`
- **URL**: `https://github.com/TheOnlyFusionCube/claude-motion` (or GitHub Pages link)
- **Intro Comment**:
  > Hi HN! We built `claude-motion` because exporting smooth video from browser animations always suffered from dropped frames, wall-clock timing drift, and non-deterministic physics.
  >
  > It uses a fixed-step tick engine with headless Playwright and FFmpeg to render 60 FPS MP4/WebM video with zero frame drops. It also works as a native Claude Code skill for autonomous creative coding.
  >
  > Live docs: https://theonlyfusioncube.github.io/claude-motion/
  > Repo: https://github.com/TheOnlyFusionCube/claude-motion
  >
  > Would love feedback on the physics solvers and renderer architecture!

#### Reddit
- **Subreddits**:
  - `r/webdev` (Showoff Saturday)
  - `r/threejs`
  - `r/javascript`
- **Title**: `I built an open-source deterministic 60 FPS motion graphics engine for WebGL, Canvas, and video export`
- **Post Body**: Use summary from `docs/launch-article.md`.

---

### 4. npm Package Ecosystem Backlink (DA 94)
npm package pages rank extremely well on Google and provide high-authority dofollow backlinks to the linked repository and homepage.

In `package.json`:
```json
{
  "name": "claude-motion",
  "repository": {
    "type": "git",
    "url": "https://github.com/TheOnlyFusionCube/claude-motion.git"
  },
  "homepage": "https://theonlyfusioncube.github.io/claude-motion/"
}
```
Publishing to npm (`npm publish --access public`) immediately generates a permanent page on `https://www.npmjs.com/package/claude-motion` with direct backlinks.
