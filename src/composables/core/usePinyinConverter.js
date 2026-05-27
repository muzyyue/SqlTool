import { pinyin } from "pinyin-pro";

export function usePinyinConverter() {
  const convertToPinyinFirstLetter = (text) => {
    // 去除首尾空格后检查是否为空
    const trimmedText = String(text).trim();
    if (!trimmedText) return "";

    // 直接获取整个文本的拼音首字母，转换为大写（不带音调）
    const firstLetters = pinyin(trimmedText, {
      pattern: "first",
      toneType: "none",
    });

    // 将拼音间的空格去掉
    const cleanedLetters = firstLetters.replace(/\s+/g, "");
    return cleanedLetters.toUpperCase();
  };

  const convertHeaders = (headers) => {
    return headers.map((header) => convertToPinyinFirstLetter(header));
  };

  return { convertToPinyinFirstLetter, convertHeaders };
}
