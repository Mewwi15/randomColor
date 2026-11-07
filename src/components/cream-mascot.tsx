import Image from "next/image";
import welcome from "../../UI/cream/52fde1b6-9781-4d66-8eeb-d446e01d8174.png";
import guide from "../../UI/cream/f6530dd4-5b82-441d-8f1e-963cf4ae9b90.png";
import suspense from "../../UI/cream/4f876550-7406-4db5-b18d-dbc149375069.png";
import thinking from "../../UI/cream/65f07563-f2b6-41ed-a6c2-88eea4dce785.png";
import encourage from "../../UI/cream/7ffe7466-9d4b-4c0d-a7e4-8ec31f1f8851.png";
import celebrate from "../../UI/cream/df5d302e-ae0a-455c-afe1-93ccef91ebc1.png";

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
      sizes={placement === "timer" ? "(max-width: 700px) 110px, (max-width: 1100px) 240px, 340px" : placement === "result" ? "(max-width: 700px) 40vw, 280px" : "(max-aspect-ratio: 1/1) 96px, (max-width: 1100px) 220px, 330px"}
      loading="eager"
      className={name === pose ? "cream-pose is-visible" : "cream-pose"}
      draggable={false}
    />)}
  </div>;
}
