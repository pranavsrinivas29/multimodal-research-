import trafilatura
from trafilatura.settings import use_config

config = use_config()
config.set("DEFAULT", "EXTRACTION_TIMEOUT", "30")

def scrape_url(url: str) -> tuple[str, str]:
    downloaded = trafilatura.fetch_url(url)
    if not downloaded:
        raise ValueError(f"Could not fetch URL: {url}")
    result = trafilatura.extract(
        downloaded, config=config,
        include_comments=False, include_tables=True,
        no_fallback=False, output_format="txt", with_metadata=True,
    )
    if result is None:
        raise ValueError(f"Could not extract content from: {url}")
    meta = trafilatura.extract_metadata(downloaded)
    title = meta.title if meta and meta.title else url
    return str(result), title