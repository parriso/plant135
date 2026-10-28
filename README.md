# Flora

A calm plant identifier. Snap a photo or type a plant name and get its history and biodiversity facts. Light mode has flowing silk waves; dark mode has drifting leaves and plants.

## Files

```
index.html          the whole app: page, styling, animations, waves, plants, tips
api/identify.js     Vercel function that asks the AI (free Gemini by default)
.env.example        shows the secret you need
README.md           this file
.gitignore          keeps secrets out of GitHub
```

`index.html` is self-contained on purpose, so it looks and animates the same wherever it is hosted. The only thing it loads from outside is the Fredoka font from Google Fonts.

## Why there's a server function

The page can't call an AI service straight from the browser, because that would expose your key. GitHub Pages only hosts static files, so on its own the buttons can't work. Hosting the repo on Vercel (free) serves the page and runs `api/identify.js` together.

## Free setup (Google Gemini, no card needed)

1. Go to aistudio.google.com, sign in with a Google account, and choose **Get API key**, then create one. Copy it.
2. Push this folder to GitHub (the `api` folder must be included).
3. At vercel.com choose Add New > Project and import your repo. No build settings are needed.
4. Under **Environment Variables**, add a name of `GEMINI_API_KEY` and paste the key as the value.
5. Deploy. Every `git push` to `main` redeploys automatically.

Good to know about the free tier: it has limits on requests per minute and per day, so heavy use will show a "too many requests" message until the limit resets. Google may also use free-tier prompts and photos to improve its products, so don't upload anything private.

If the default model name stops working, add an environment variable `GEMINI_MODEL` set to a current free Flash model listed at aistudio.google.com, then redeploy.

## No server? Use your own free key right in the app

If Flora can't reach `api/identify.js` (for example on GitHub Pages, or if the `api` folder is missing), it shows a box asking for a free Gemini key instead of failing. Get one at aistudio.google.com (Get API key), paste it into the box, and press Save. The key is stored only in that browser on that device, it is never added to your repo, and Flora then talks to Google directly. Each person who uses your site would paste their own key, so for sharing with others the Vercel setup above is better.

## Your own trained flower model (optional)

Train a model at teachablemachine.withgoogle.com (Image Project), export it as **TensorFlow.js**, and put the three files it gives you (`model.json`, `metadata.json` and the `.bin` file) in a folder named `model` next to `index.html`. For photos, Flora checks your model first. If the model is at least 85% sure, it uses that flower name (and adds the history and facts if the AI is connected). If the model isn't sure, or the `model` folder isn't there, Flora asks the AI instead. A model only knows the flowers it was trained on, so it can confidently pick the wrong one for a plant it has never seen.

## Paid option (Anthropic Claude)

Set `ANTHROPIC_API_KEY` instead (needs credit from console.anthropic.com). If both keys are set, Gemini is used.

## Put it on GitHub

1. Create an empty repo on github.com (no README), for example `flora`.
2. In this folder:
   ```
   git init
   git add .
   git commit -m "Flora plant identifier"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/flora.git
   git push -u origin main
   ```

## If search or photo doesn't work

Flora tells you what's wrong in the message it shows. You can also check the server directly.

1. Open `https://YOUR-SITE.vercel.app/api/identify` in your browser (use your real Vercel address).
2. What you see tells you the fix:
   - **Page not found (404):** the `api` folder isn't in your GitHub repo. Upload `api/identify.js` inside a folder named `api`, then let Vercel redeploy.
   - **`"hasKey":false`:** no key is set. In Vercel go to Settings > Environment Variables, add `GEMINI_API_KEY`, then open Deployments, click the three dots on the latest one and choose Redeploy. A new key only takes effect on a new deployment.
   - **`"hasKey":true,"provider":"gemini"`:** the server is fine. If Flora still errors, its message names the cause (rejected key, unavailable model, or rate limit). Vercel's Logs tab shows more detail.
3. Visit the Vercel address. Opening `index.html` from your computer, or from GitHub Pages, can't run the server function.

## Try it locally

```
npx vercel dev
```
with a `.env.local` copied from `.env.example`.
