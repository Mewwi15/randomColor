import Image from "next/image";
import welcome from "../../UI/creamNew/da6b6652-b60e-460d-9d01-38910d078c74.png";
import guide from "../../UI/creamNew/d60cfc22-d342-426b-aa81-2396186162b0.png";
import suspense from "../../UI/creamNew/fec40b31-c554-479c-a3e2-25d7523946fb.png";
import thinking from "../../UI/creamNew/9aa19e45-5e3e-469e-8b8a-779c66343bb5.png";
import encourage from "../../UI/creamNew/6ecb4c35-d7d4-40ee-b8a1-332aee308ce9.png";
import celebrate from "../../UI/creamNew/45b38d5a-d8ff-44c9-a6b8-c79fbf4fe700.png";

const POSES = { welcome, guide, suspense, thinking, encourage, celebrate };
export type CreamPose = keyof typeof POSES;

export function CreamMascot({ pose, placement = "stage" }: { pose: CreamPose; placement?: "stage" | "result" | "timer" }) {
  return <div className={`cream-mascot cream-${placement}`} aria-hidden="true" data-pose={pose}>
    {Object.entries(POSES).map(([name, source]) => <Image
      key={name}
      src={source}
      alt=""
      width={330}
      height={495}
      sizes={placement === "timer" ? "(max-width: 700px) 120px, 260px" : placement === "result" ? "(max-width: 700px) 40vw, 280px" : "(max-aspect-ratio: 1/1) 96px, (max-width: 1100px) 220px, 330px"}
      loading="eager"
      className={name === pose ? "cream-pose is-visible" : "cream-pose"}
      draggable={false}
    />)}
  </div>;
}
