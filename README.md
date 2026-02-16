# PrayerFeed Prototype

This workspace now includes two runnable prototypes:

- React/Vite app (`src/PrayerFeedApp.jsx`)
- Streamlit app (`streamlit_app.py`) for Streamlit Community Cloud

## Run Streamlit locally

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## Deploy on Streamlit Community Cloud

1. Push this project to a GitHub repo.
2. Go to [share.streamlit.io](https://share.streamlit.io/) and click **New app**.
3. Select your repo/branch.
4. Set **Main file path** to `streamlit_app.py`.
5. Deploy.

Streamlit will use `requirements.txt` automatically.

## Run React version locally (optional)

```bash
npm install
npm run dev
```
