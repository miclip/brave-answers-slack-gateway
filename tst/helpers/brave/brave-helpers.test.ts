import braveValidResponse1 from '@tst/mocks/brave/valid-summary-response-1.json';
import braveValidResponse2 from '@tst/mocks/brave/valid-summary-response-2.json';
import { MOCK_DEPENDENCIES, MOCK_ENV } from '@tst/mocks/mocks';

import {
  getResponseAsBlocks,
  SummarizerSearchApiResponse
} from '@helpers/brave/brave-helpers';
import { callAPI } from '@src/helpers/brave/brave-client';


describe('Brave helpers test', () => {
  test('Should get a response as block with context', async () => {
    const response = await callAPI('message', MOCK_ENV, MOCK_DEPENDENCIES,);
    expect(response).toEqual(braveValidResponse1);
  });

  test('Test response markdown conversion', async () => {
    const response = getResponseAsBlocks(braveValidResponse1 as SummarizerSearchApiResponse);
    expect(response).toEqual([
      {
        text: {
          "text": "what is the second tallest mountain?",
          "type": "plain_text",
        },
        "type": "header",
      },
      {
        text: {
          "text": "According to the search results, K2 is the second tallest mountain in the world, with a height of 8,611 meters (28,251 feet). It is located in the Karakoram Range and lies partly in a Chinese-administered enclave of the Kashmir region within the Uygur Autonomous Region of Xinjiang, China, and partly in the Gilgit-Baltistan region of Pakistan. K2 is also known as the \"Savage Mountain\" due to its extreme weather conditions and challenging climbing routes.",
          "type": "mrkdwn",
        },
        "type": "section",
      },
      {

        "type": "divider"

      },
      {
        "type": "header",
        "text": {
          "text": "Context",
          "type": "plain_text"
        }

      },
      {
        text: {
          "text": "<https://www.britannica.com/place/K2|K2 | Peak, Geography, History, & Map | Britannica>",
          "type": "mrkdwn",
        },
        "type": "section",
      },
      {
        text: {
          "text": "<https://www.muchbetteradventures.com/magazine/highest-mountains-in-the-world-top-10/|Highest Mountains in the World: The Top 10 Explored>",
          "type": "mrkdwn",
        },
        "type": "section",
      },
      {
        text: {
          "text": "<https://www.worldatlas.com/mountains/10-highest-mountains-in-the-world.html|10 Highest Mountains In The World - WorldAtlas>",
          "type": "mrkdwn",
        },
        "type": "section",
      },
      {
        text: {
          "text": "<https://www.climbing.com/places/k2-worlds-second-highest-mountain/|K2, the World's Second Highest Mountain - Climbing>",
          "type": "mrkdwn",
        },
        "type": "section",
      },
      {
        text: {
          "text": "<https://www.ultimatekilimanjaro.com/15-tallest-mountains-in-the-world/|The 15 Tallest Mountains in the World | Ultimate Kilimanjaro>",
          "type": "mrkdwn",
        },
        "type": "section",
      },
      {
        text: {
          "text": "<https://en.wikipedia.org/wiki/K2|K2 - Wikipedia>",
          "type": "mrkdwn",
        },
        "type": "section",
      },
      {
        text: {
          "text": "<https://en.wikipedia.org/wiki/List_of_highest_mountains_on_Earth|List of highest mountains on Earth>",
          "type": "mrkdwn",
        },
        "type": "section",
      },

    ]);


  });
  const response2 = getResponseAsBlocks(braveValidResponse2 as SummarizerSearchApiResponse);
  expect(response2).toEqual([
    {
      text: {
        "text": "how do I html encode a string in bash?",
        "type": "plain_text",
      },
      "type": "header",
    },
    {
      text: {
        "text": "To HTML encode a string in bash, you can use the `sed` command with specific patterns to replace special characters with their corresponding HTML entities. Here are a few examples:\n\n1. *Simple HTML encoding*:\n```bash\nstring=\"Hello & World!\"\necho \"$string\" | sed 's/&/\\&amp;/g; s/</\\&lt;/g; s/>/\\&gt;/g'\n```\nThis will output: `Hello &amp; World!`\n\n2. *More comprehensive HTML encoding*:\n```bash\nstring=\"Hello & World! <a href='http://example.com'>Link</a>\"\necho \"$string\" | sed 's/&/\\&amp;/g; s/</\\&lt;/g; s/>/\\&gt;/g; s/\"/\\&quot;/g; s/\\'/\\&apos;/g'\n```\nThis will output: `Hello &amp; World! &lt;a href='http://example.com'&gt;Link&lt;/a&gt;`\n\n3. *Using a function*:\n```bash\nhtmlEscape() {\n  local s\n  s=${1//&amp;/&amp;}\n  s=${s//&lt;/&lt;}\n  s=${s//&gt;/&gt;}\n  s=${s//\"/\\\"}\n  s=${s//\\'/\\'}\n  printf -- %s \"$s\"\n}\n\nstring=\"Hello & World! <a href='http://example.com'>Link</a>\"\necho $(htmlEscape \"$string\")\n```\nThis will output: `Hello &amp; World! &lt;a href='http://example.com'&gt;Link&lt;/a&gt;`\n\nNote: These examples assume that you want to encode the special characters `&`, `<`, `>`, `\"`, and `'` to their corresponding HTML entities. You can modify the patterns to include additional characters or adjust the encoding as needed.",
        "type": "mrkdwn",
      },
      "type": "section",
    },
    {
      "type": "divider"
    },
    {
      "type": "header",
      "text": {
        "text": "Context",
        "type": "plain_text"
      }
    },
    {
      text: {
        "text": "<https://unix.stackexchange.com/questions/13766/how-to-convert-to-html-code|command line - How to convert to HTML code? - Unix & Linux Stack Exchange>",
        "type": "mrkdwn",
      },
      "type": "section",
    },
  ]);

});
