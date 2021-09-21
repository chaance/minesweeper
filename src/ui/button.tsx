import * as React from "react";
import cx from "clsx";
import { scope } from "../lib/utils";

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			children,
			type: buttonType = "button",
			className,
			onPointerDown,
			onPointerUp,
			...props
		},
		forwardedRef
	) => {
		let [metaPress, setMetaPress] = React.useState(false);
		React.useEffect(() => {
			if (metaPress) {
				let listener = () => {
					setMetaPress(false);
				};
				window.addEventListener("pointerup", listener);
				return () => {
					window.removeEventListener("pointerup", listener);
				};
			}
		}, [metaPress]);

		return (
			<button
				ref={forwardedRef}
				type={buttonType}
				className={cx(scope("button"), className)}
				data-meta-pressed={metaPress ? "" : undefined}
				onPointerDown={(event) => {
					if (event.metaKey) {
						setMetaPress(true);
					}
					onPointerDown && onPointerDown(event);
				}}
				onPointerUp={(event) => {
					setMetaPress(false);
					onPointerUp && onPointerUp(event);
				}}
				{...props}
			>
				{children}
			</button>
		);
	}
);

Button.displayName = "Button";

interface ButtonProps extends React.ComponentPropsWithRef<"button"> {}

export type { ButtonProps };
export { Button };
