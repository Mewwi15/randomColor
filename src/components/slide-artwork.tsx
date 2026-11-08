"use client";

import Image from "next/image";
import { useEffect, useReducer } from "react";
import { SLIDES } from "@/lib/slides";
import { initialSlideDisplay, slideDisplayReducer, slidePagesToRender } from "@/lib/slide-display";

export function SlideArtwork({ page }: { page: number }) {
  const [display, dispatch] = useReducer(slideDisplayReducer, SLIDES.length, initialSlideDisplay);

  useEffect(() => { dispatch({ type: "select", page }); }, [page]);

  return <div className="slide-image-stack" aria-busy={!display.readyPages.includes(page)}>
    {slidePagesToRender(display).map(index => {
      const visible = index === display.visiblePage && display.readyPages.includes(index);
      return <Image
        key={index}
        className={`slide-art${visible ? " is-visible" : ""}`}
        src={SLIDES[index]}
        alt={`สไลด์การสอนหน้า ${index + 1} จาก ${SLIDES.length}`}
        aria-hidden={!visible}
        fill
        sizes="100vw"
        loading="eager"
        draggable={false}
        onLoad={event => {
          // Next.js invokes onLoad after decoding. Swap only once pixels are ready.
          if (event.currentTarget.naturalWidth > 0) dispatch({ type: "loaded", page: index });
        }}
      />;
    })}
  </div>;
}
