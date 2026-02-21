// 概念插画（Conceptual Illustration），就像 Medium、Smashing Magazine 那种 - 有具体内容但保持插画风格的封面图。
export const generatePrompt = (summary: string, category: string) => {
  const style = `
    Warm hand-drawn flat cartoon illustration style,
    cream or warm beige background with orange and teal-green accent colors,
    outlined doodle-style icons and small cartoon characters (people or robots),
    semi-hand-drawn aesthetic with visible strokes and slightly organic lines,
    warm muted earthy color palette (cream, soft orange, sage green, warm teal),
    educational infographic feel with clear visual storytelling,
  `
    .trim()
    .replace(/\s+/g, " ");

  // 让内容主导视觉
  const content = `
    Illustrate the concept: "${summary}".
    Field: ${category}.
    
    Create a scene, metaphor, or visual narrative that captures the essence of this topic.
    Use symbolic elements, environments, or scenarios that make the concept tangible.
    The viewer should be able to guess what the article is about from the image.
  `
    .trim()
    .replace(/\s+/g, " ");

  const qualities = `
    Engaging and informative visual storytelling,
    modern illustration techniques,
    professional but approachable feel,
    16:9 landscape blog cover format.
    Avoid: photorealism, dark/moody tones, cluttered composition.
    No text in the image.
  `
    .trim()
    .replace(/\s+/g, " ");

  return `${style} ${content} ${qualities}`;
};
