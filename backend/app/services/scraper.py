import trafilatura

def scrape_url(url: str) -> tuple[str, str]:
    """
    Scrape a URL and return (clean_text, page_title).
    """
    downloaded = trafilatura.fetch_url(url)
    if not downloaded:
        raise ValueError(f"Could not fetch URL: {url}")

    # Extract metadata separately for title
    meta = trafilatura.extract_metadata(downloaded)
    title = meta.title if meta and meta.title else url

    # Extract text only — no metadata object mixing
    text = trafilatura.extract(
        downloaded,
        include_comments=False,
        include_tables=True,
        no_fallback=False,
        output_format="txt",
    )

    if not text:
        raise ValueError(f"Could not extract content from: {url}")

    return text.strip(), title
