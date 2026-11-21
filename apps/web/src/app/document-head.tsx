import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { getDocumentTitle } from './routing/route-metadata';
import { STARTUP_ATTRIBUTE } from './startup/consts';

export const DocumentHead = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    for (const title of document.head.querySelectorAll(
      `title[${STARTUP_ATTRIBUTE}]`,
    )) {
      title.remove();
    }
  }, []);

  return <title>{getDocumentTitle(pathname)}</title>;
};
