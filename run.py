import base64
import fire


def to_b64(file):
    with open(file, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def claude_extract_csv(client, image_data, mime_type):

    message = client.messages.create(
        model="claude-3-7-sonnet-20250219",
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": mime_type,
                            "data": image_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": "Please extract the data from this image and return it in CSV format. Specifically, we care about the names on the left, and all filled values on the right. If a number is missing, please fill it with NA. If a number is unreadable or you're not confident, please fill it with 'UN'. Place the csv data inside <csv>here</csv> tags like so:\n"
                        "<csv>\n"
                        "id,name,data1,data2,data3,...\n"
                        "1,John Doe,123,456,789,...\n"
                        "2,Jane Smith,234,567,890,...\n"
                        "..."
                        "</csv>\n",
                    },
                ],
            }
        ],
    )

    content = message.content[0].text

    comment_start, content = content.split("<csv>")
    content, comment_end = content.split("</csv>")
    content = content.strip()

    return content, f"{comment_start}[...data...]{comment_end}"


def extract_csv(file):
    import anthropic

    import os
    import sys

    if "ANTHROPIC_API_KEY" in os.environ:
        api_key = os.environ["ANTHROPIC_API_KEY"]

    client = anthropic.Anthropic(api_key=api_key)

    mime_type = "image/jpeg"  # Change this to the actual MIME type of your image
    image_data = to_b64(file)

    data, comments = claude_extract_csv(client, image_data, mime_type)

    # print comments to stderr
    print(comments, file=sys.stderr)
    # print data to stdout
    print(data, file=sys.stdout)


if __name__ == "__main__":
    fire.Fire(extract_csv)
