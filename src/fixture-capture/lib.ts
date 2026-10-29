// Pure helpers of fixture-capture: no DOM access, so they run under node:test.

/** Site part of a fixture file name: `www.discogs.com` -> `discogs`, `m.youtube.com` -> `youtube` */
export function siteKey(hostname: string): string {
	const labels = hostname.toLowerCase().split('.').filter(Boolean);
	return labels.length > 1 ? labels[labels.length - 2] : labels[0] || 'page';
}

/** Case part of a fixture file name: lowercase latin, digits and dashes, at most 60 chars */
export function caseSlug(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.slice(0, 60)
		.replace(/^-+|-+$/g, '');
}

/** Case name suggested in the prompt, made from the page path */
export function defaultCaseName(pathname: string): string {
	return caseSlug(pathname) || 'home';
}

export function fixtureFileName(site: string, caseName: string): string {
	return `${site}__${caseName}.html`;
}

/** HTML comment put on top of a fixture: where and when it was captured */
export function fixtureHeader(info: {
	url: string;
	capturedAt: Date;
	userAgent: string;
	scriptHandler: string;
}): string {
	const lines = [
		`source: ${info.url}`,
		`captured: ${info.capturedAt.toISOString()}`,
		`browser: ${info.userAgent}`,
		`manager: ${info.scriptHandler}`,
	];
	// "-->" inside a value would end the comment early
	return `<!--\n${lines.map((l) => l.replaceAll('-->', '--&gt;')).join('\n')}\n-->`;
}
