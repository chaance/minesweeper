export function scope(name: string) {
	return name ? `ms--${name.replace(/^[-\s]+/g, "")}` : "";
}

export function isFunction(value: any): value is Function {
	return typeof value === "function";
}
