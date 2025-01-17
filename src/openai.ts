export const callGPT = async (prompt: string) => {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer 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`,
    },

    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });
  const json = await res.json();

  return json.choices[0].message.content;
};

export const smartFormat = async (text: string) => {
  return await callGPT(`
    Please add grammar and format the following sentence, 
    respond with only the new sentence:
    "${text}"
  `);
};
