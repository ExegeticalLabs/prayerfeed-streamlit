import copy
import time

import streamlit as st


PRAYERS = [
    {
        "id": 1,
        "author": "Sarah M.",
        "cat": "Health",
        "text": "Please pray for my mom's surgery tomorrow morning. She's having a double bypass and she's scared. We trust God's plan but could use your prayers for the surgical team and a smooth recovery.",
        "time": "2h ago",
        "day": 1,
        "pc": 47,
        "pm": 192,
        "mine": False,
        "ans": False,
        "anon": False,
    },
    {
        "id": 2,
        "author": "A Church Member",
        "cat": "Family",
        "text": "Going through a really difficult season in my marriage. We're both believers but struggling to communicate. Praying for restoration and wisdom.",
        "time": "5h ago",
        "day": 2,
        "pc": 31,
        "pm": 98,
        "mine": False,
        "ans": False,
        "anon": True,
    },
    {
        "id": 3,
        "author": "James K.",
        "cat": "Work",
        "text": "I was laid off last Friday after 12 years. Feeling lost but trusting God has a plan. Prayers for provision and for the right doors to open.",
        "time": "8h ago",
        "day": 3,
        "pc": 63,
        "pm": 287,
        "mine": False,
        "ans": False,
        "anon": False,
    },
    {
        "id": 4,
        "author": "You",
        "cat": "Health",
        "text": "Asking for prayers as I deal with some ongoing back pain that's been affecting my ability to work and be present with my family. Trusting God for healing.",
        "time": "1d ago",
        "day": 4,
        "pc": 38,
        "pm": 156,
        "mine": True,
        "ans": False,
        "anon": False,
    },
    {
        "id": 5,
        "author": "David R.",
        "cat": "Spiritual",
        "text": "Asking for prayer as I prepare to lead our youth group through a study on identity in Christ. Pray that the students' hearts would be open.",
        "time": "2d ago",
        "day": 5,
        "pc": 28,
        "pm": 67,
        "mine": False,
        "ans": False,
        "anon": False,
    },
    {
        "id": 6,
        "author": "Elder Thomas",
        "cat": "Spiritual",
        "text": "Pray for our church's unity this season as we navigate changes in leadership. May God's wisdom guide every decision and every conversation.",
        "time": "3d ago",
        "day": 6,
        "pc": 55,
        "pm": 230,
        "mine": False,
        "ans": False,
        "anon": False,
    },
]

JOURNAL = [
    {
        "id": 101,
        "text": "Lord, give me patience with the kids this week. Help me be the dad they need.",
        "cat": "Family",
        "created": "Today",
        "ans": False,
    },
    {
        "id": 102,
        "text": "Praying for Jessica's work situation - the staffing changes are stressing her out. Give her wisdom and peace.",
        "cat": "Family",
        "created": "2 days ago",
        "ans": False,
    },
    {
        "id": 103,
        "text": "Thank you for Mia's safety. Continue to watch over her wherever she goes.",
        "cat": "Gratitude",
        "created": "4 days ago",
        "ans": False,
    },
]

PROMPTS = [
    "What's been weighing on your family lately?",
    "Any work struggles you need to bring before God?",
    "How has your personal time in God's word been?",
    "What do you have to be thankful for right now?",
    "Any friends or neighbors on your heart?",
    "What personal struggle needs God's strength today?",
]

CATEGORY_COLORS = {
    "Health": "#e06060",
    "Family": "#5b8db8",
    "Work": "#c9a227",
    "Gratitude": "#5a9e6f",
    "Spiritual": "#8b6caf",
    "Other": "#7a8a9a",
}

DEFAULT_STATS = {
    "day": {
        "churchPrayers": 3,
        "churchMins": 8,
        "churchNeeds": 3,
        "churchGoalP": 5,
        "churchGoalM": 15,
        "churchGoalN": 5,
        "personalPrayers": 1,
        "personalMins": 4,
        "personalGoalP": 3,
        "personalGoalM": 10,
    },
    "week": {
        "churchPrayers": 12,
        "churchMins": 34,
        "churchNeeds": 8,
        "churchGoalP": 15,
        "churchGoalM": 45,
        "churchGoalN": 10,
        "personalPrayers": 6,
        "personalMins": 18,
        "personalGoalP": 10,
        "personalGoalM": 30,
    },
    "year": {
        "churchPrayers": 412,
        "churchMins": 1840,
        "churchNeeds": 189,
        "churchGoalP": 500,
        "churchGoalM": 2000,
        "churchGoalN": 200,
        "personalPrayers": 280,
        "personalMins": 960,
        "personalGoalP": 365,
        "personalGoalM": 1200,
    },
}


def fmt_time(minutes: int) -> str:
    if minutes < 60:
        return f"{minutes}m"
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours}h" if mins == 0 else f"{hours}h {mins}m"


def init_state() -> None:
    if "prayers" not in st.session_state:
        st.session_state.prayers = copy.deepcopy(PRAYERS)
    if "journal" not in st.session_state:
        st.session_state.journal = copy.deepcopy(JOURNAL)
    if "stats" not in st.session_state:
        st.session_state.stats = copy.deepcopy(DEFAULT_STATS)
    if "feed_index" not in st.session_state:
        st.session_state.feed_index = 0
    if "journal_index" not in st.session_state:
        st.session_state.journal_index = 0
    if "answered_index" not in st.session_state:
        st.session_state.answered_index = 0
    if "notice" not in st.session_state:
        st.session_state.notice = ""
    if "hold_context" not in st.session_state:
        st.session_state.hold_context = None
    if "hold_started_at" not in st.session_state:
        st.session_state.hold_started_at = None
    if "prefill_journal" not in st.session_state:
        st.session_state.prefill_journal = ""


def push_notice(message: str) -> None:
    st.session_state.notice = message


def consume_notice() -> None:
    if st.session_state.notice:
        st.success(st.session_state.notice)
        st.session_state.notice = ""


def update_stats(is_journal: bool, seconds: int) -> None:
    minute_add = max(1, round(seconds / 60))
    for period in ("day", "week", "year"):
        block = st.session_state.stats[period]
        if is_journal:
            block["personalPrayers"] += 1
            block["personalMins"] += minute_add
        else:
            block["churchPrayers"] += 1
            block["churchMins"] += minute_add


def start_prayer(entry_id: int, is_journal: bool) -> None:
    st.session_state.hold_context = {"id": entry_id, "is_journal": is_journal}
    st.session_state.hold_started_at = time.time()
    push_notice("Prayer started. Click Stop when finished.")


def stop_prayer(entry_id: int, is_journal: bool) -> None:
    context = st.session_state.hold_context
    started_at = st.session_state.hold_started_at
    if not context or started_at is None:
        push_notice("Start prayer first.")
        return
    if context["id"] != entry_id or context["is_journal"] != is_journal:
        push_notice("Stop the active prayer on the current card.")
        return

    elapsed = max(1, round(time.time() - started_at))
    update_stats(is_journal=is_journal, seconds=elapsed)

    if not is_journal:
        minute_add = max(1, round(elapsed / 60))
        for prayer in st.session_state.prayers:
            if prayer["id"] == entry_id:
                prayer["pc"] += 1
                prayer["pm"] += minute_add
                break

    st.session_state.hold_context = None
    st.session_state.hold_started_at = None
    push_notice(f"Prayer recorded - {elapsed}s")


def render_header() -> None:
    st.markdown(
        """
        <div style="padding: 4px 0 12px 0;">
          <div style="font-size: 1.7rem; color: #d6c5a1; font-weight: 600;">Grace Community</div>
          <div style="font-size: 0.95rem; color: #9ba3b3;">Sacred space, not social space.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_card(entry: dict, total: int, position: int, is_journal: bool) -> None:
    cat = entry.get("cat", "Other")
    color = CATEGORY_COLORS.get(cat, CATEGORY_COLORS["Other"])
    author = entry.get("author", "You")
    time_label = entry.get("time", entry.get("created", "Now"))
    text = entry["text"]

    st.markdown(
        f"""
        <div style="
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 18px;
          background: linear-gradient(180deg, rgba(24,32,46,0.95), rgba(13,18,27,0.95));
          margin-bottom: 14px;
        ">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: {color}; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em;">{cat}</span>
            <span style="color: #7f8ba3; font-size: 0.78rem;">{position}/{total}</span>
          </div>
          <div style="color: #f2f4f8; font-size: 1.08rem; line-height: 1.65; margin-bottom: 14px;">{text}</div>
          <div style="color: #9aa4ba; font-size: 0.85rem;">{author} · {time_label}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if entry.get("mine") and not is_journal:
        col_a, col_b = st.columns(2)
        col_a.metric("People prayed (private)", entry["pc"])
        col_b.metric("Cumulative prayer time (private)", fmt_time(entry["pm"]))

    if not is_journal and entry.get("mine"):
        if st.button("Mark as answered", key=f"ans_{entry['id']}"):
            for prayer in st.session_state.prayers:
                if prayer["id"] == entry["id"]:
                    prayer["ans"] = True
                    break
            push_notice("Moved to Answered wall.")
            st.rerun()

    if is_journal and st.button("Share with church", key=f"share_{entry['id']}"):
        new_prayer = {
            "id": int(time.time() * 1000),
            "author": "You",
            "cat": entry["cat"],
            "text": entry["text"],
            "time": "Just now",
            "day": 1,
            "pc": 0,
            "pm": 0,
            "mine": True,
            "ans": False,
            "anon": False,
        }
        st.session_state.prayers.insert(0, new_prayer)
        push_notice("Shared with church feed.")
        st.rerun()

    start_col, stop_col, status_col = st.columns([1, 1, 1.4])
    if start_col.button("Start Prayer", key=f"start_{entry['id']}_{is_journal}"):
        start_prayer(entry["id"], is_journal=is_journal)
    if stop_col.button("Stop Prayer", key=f"stop_{entry['id']}_{is_journal}"):
        stop_prayer(entry["id"], is_journal=is_journal)

    context = st.session_state.hold_context
    started = st.session_state.hold_started_at
    if context and started and context["id"] == entry["id"] and context["is_journal"] == is_journal:
        elapsed = max(1, round(time.time() - started))
        status_col.caption(f"Praying... {elapsed}s")
    else:
        status_col.caption("Press start, then stop when done.")


def render_nav(index_key: str, total: int) -> int:
    if total == 0:
        return 0
    st.session_state[index_key] = max(0, min(st.session_state[index_key], total - 1))
    prev_col, center_col, next_col = st.columns([1, 1.2, 1])
    if prev_col.button("Previous", key=f"prev_{index_key}", disabled=st.session_state[index_key] <= 0):
        st.session_state[index_key] -= 1
        st.rerun()
    center_col.markdown(
        f"<div style='text-align:center; padding-top:0.5rem; color:#95a1b8;'>Card {st.session_state[index_key] + 1} of {total}</div>",
        unsafe_allow_html=True,
    )
    if next_col.button("Next", key=f"next_{index_key}", disabled=st.session_state[index_key] >= total - 1):
        st.session_state[index_key] += 1
        st.rerun()
    return st.session_state[index_key]


def sidebar_compose(section: str) -> None:
    st.sidebar.markdown("### Compose")
    if section == "Journal":
        with st.sidebar.form("compose_journal"):
            seed = st.session_state.prefill_journal
            text = st.text_area("New journal entry", value=seed, height=140)
            cat = st.selectbox("Category", list(CATEGORY_COLORS.keys()))
            submitted = st.form_submit_button("Add to Journal")
            if submitted and text.strip():
                st.session_state.journal.insert(
                    0,
                    {
                        "id": int(time.time() * 1000),
                        "text": text.strip(),
                        "cat": cat,
                        "created": "Just now",
                        "ans": False,
                    },
                )
                st.session_state.prefill_journal = ""
                push_notice("Added to your prayer journal.")
                st.rerun()
    else:
        with st.sidebar.form("compose_church"):
            text = st.text_area("Share a prayer need", height=140)
            cat = st.selectbox("Category", list(CATEGORY_COLORS.keys()), key="church_cat")
            keep_private = st.checkbox("Keep my name private (elders still see me)")
            submitted = st.form_submit_button("Submit Prayer")
            if submitted and text.strip():
                st.session_state.prayers.insert(
                    0,
                    {
                        "id": int(time.time() * 1000),
                        "author": "A Church Member" if keep_private else "You",
                        "cat": cat,
                        "text": text.strip(),
                        "time": "Just now",
                        "day": 1,
                        "pc": 0,
                        "pm": 0,
                        "mine": True,
                        "ans": False,
                        "anon": keep_private,
                    },
                )
                push_notice("Prayer request shared with your church.")
                st.rerun()


def render_dashboard() -> None:
    period = st.radio("Period", ["day", "week", "year"], horizontal=True)
    data = st.session_state.stats[period]

    st.caption("Only you can see this.")

    church_col, personal_col = st.columns(2)
    with church_col:
        st.markdown("#### Church")
        st.metric("Prayers", data["churchPrayers"])
        st.progress(min(1.0, data["churchPrayers"] / data["churchGoalP"]))
        st.metric("Minutes", data["churchMins"])
        st.progress(min(1.0, data["churchMins"] / data["churchGoalM"]))
        st.metric("Needs covered", data["churchNeeds"])
        st.progress(min(1.0, data["churchNeeds"] / data["churchGoalN"]))

    with personal_col:
        st.markdown("#### Personal")
        st.metric("Prayers", data["personalPrayers"])
        st.progress(min(1.0, data["personalPrayers"] / data["personalGoalP"]))
        st.metric("Minutes", data["personalMins"])
        st.progress(min(1.0, data["personalMins"] / data["personalGoalM"]))

    total_prayers = data["churchPrayers"] + data["personalPrayers"]
    total_minutes = data["churchMins"] + data["personalMins"]
    st.info(f"Total: {total_prayers} prayers - {fmt_time(total_minutes)} in prayer")


def main() -> None:
    st.set_page_config(page_title="PrayerFeed Prototype", page_icon="🙏", layout="centered")
    st.markdown(
        """
        <style>
          .stApp {
            background: linear-gradient(160deg, #0b0f14 0%, #111820 40%, #0b0f14 100%);
          }
          section[data-testid="stSidebar"] {
            background: #0f141d;
          }
          div[data-testid="stMetricValue"] {
            color: #e7ebf4;
          }
        </style>
        """,
        unsafe_allow_html=True,
    )

    init_state()
    render_header()
    consume_notice()

    section = st.sidebar.radio("View", ["Prayers", "Journal", "Answered", "Dashboard"])
    if section in ("Prayers", "Journal"):
        sidebar_compose(section)

    if section == "Prayers":
        active_prayers = [p for p in st.session_state.prayers if not p["ans"]]
        if not active_prayers:
            st.warning("No active prayers.")
            return
        index = render_nav("feed_index", len(active_prayers))
        render_card(active_prayers[index], total=len(active_prayers), position=index + 1, is_journal=False)

    elif section == "Journal":
        if st.session_state.journal:
            index = render_nav("journal_index", len(st.session_state.journal))
            render_card(
                st.session_state.journal[index],
                total=len(st.session_state.journal),
                position=index + 1,
                is_journal=True,
            )
        else:
            st.warning("Your prayer journal is empty.")

        st.markdown("### Guided Reflection Prompts")
        selected_prompt = st.selectbox("Choose a prompt", PROMPTS)
        if st.button("Use Prompt in Journal Draft"):
            st.session_state.prefill_journal = f"{selected_prompt}\n\n"
            push_notice("Prompt loaded into the journal form in the sidebar.")
            st.rerun()

    elif section == "Answered":
        answered = [p for p in st.session_state.prayers if p["ans"]]
        if not answered:
            st.info("No answered prayers yet.")
            return
        index = render_nav("answered_index", len(answered))
        render_card(answered[index], total=len(answered), position=index + 1, is_journal=False)

    else:
        render_dashboard()


if __name__ == "__main__":
    main()
