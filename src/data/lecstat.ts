/* Số liệu một bài giảng cho màn "Bài giảng của lộ trình" (8b): số khối và số khối visual chưa bám note. Thuần. */
import { lectureBlocks } from "./lecture.ts";
import { groundedMap } from "./lecshell.ts";

export interface LecStat { blocks: number; ungrounded: number }
export function lectureStat(html: string, note: string): LecStat {
  const blocks = lectureBlocks(html), g = groundedMap(blocks, note);
  return { blocks: blocks.length, ungrounded: Object.values(g).filter(ok => !ok).length };
}
