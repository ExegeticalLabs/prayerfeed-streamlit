# PrayerFeed Prototype

This workspace now includes two runnable prototypes:

- React/Vite app (`src/PrayerFeedApp.jsx`)
- Streamlit app (`streamlit_app.py`) for Streamlit Community Cloud

## Run Streamlit locally

```bash
pip install -r requirements.txt
npm install
npm run build
streamlit run streamlit_app.py
```

The Streamlit app embeds the built React prototype from `dist/`.

## Deploy on Streamlit Community Cloud

1. Build the React app locally (`npm run build`).
2. Commit and push the `dist/` folder with the rest of the project.
3. Go to [share.streamlit.io](https://share.streamlit.io/) and click **New app**.
4. Select your repo/branch.
5. Set **Main file path** to `streamlit_app.py`.
6. Deploy.

Streamlit will use `requirements.txt` automatically.

## Run React version locally (optional)

```bash
npm install
npm run dev
```
