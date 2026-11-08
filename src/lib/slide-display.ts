export type SlideDisplay = {
  page: number;
  visiblePage: number;
  readyPages: number[];
  pageCount: number;
};

type SlideDisplayAction = { type: "select" | "loaded"; page: number };

export function initialSlideDisplay(pageCount: number): SlideDisplay {
  return { page: 0, visiblePage: 0, readyPages: [], pageCount };
}

/** Keep the visible image mounted while preparing the requested page and its neighbors. */
export function slidePagesToRender(state: SlideDisplay): number[] {
  return [...new Set([state.visiblePage, state.page, state.page - 1, state.page + 1])]
    .filter(page => page >= 0 && page < state.pageCount)
    .sort((a, b) => a - b);
}

function retainMountedImages(state: SlideDisplay): SlideDisplay {
  const mounted = slidePagesToRender(state);
  return { ...state, readyPages: state.readyPages.filter(page => mounted.includes(page)) };
}

export function slideDisplayReducer(state: SlideDisplay, action: SlideDisplayAction): SlideDisplay {
  if (!Number.isInteger(action.page) || action.page < 0 || action.page >= state.pageCount) return state;
  if (action.type === "select") {
    if (action.page === state.page) return state;
    return retainMountedImages({
      ...state,
      page: action.page,
      visiblePage: state.readyPages.includes(action.page) ? action.page : state.visiblePage,
    });
  }
  // Ignore completions from images that were removed after a rapid page change.
  if (!slidePagesToRender(state).includes(action.page) || state.readyPages.includes(action.page)) return state;
  return retainMountedImages({
    ...state,
    readyPages: [...state.readyPages, action.page],
    visiblePage: action.page === state.page ? action.page : state.visiblePage,
  });
}
