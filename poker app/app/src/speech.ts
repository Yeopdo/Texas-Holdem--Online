import * as Speech from "expo-speech";
import { ActionAnnouncePayload } from "./types";

const ACTION_WORD: Record<ActionAnnouncePayload["type"], string> = {
  fold: "폴드",
  check: "체크",
  call: "콜",
  raise: "레이즈",
  allin: "올인",
};

export function announceAction(action: ActionAnnouncePayload) {
  const word = ACTION_WORD[action.type];
  const withAmount = action.type === "raise" && action.amount ? `${word} ${action.amount}` : word;
  Speech.speak(`${action.nickname} ${withAmount}`, { language: "ko", pitch: 1.0, rate: 1.05 });
}
