export default function getDataUrl(file) {
  const base64 = file.buffer.toString("base64");

  return {
    content: `data:${file.mimetype};base64,${base64}`,
  };
}