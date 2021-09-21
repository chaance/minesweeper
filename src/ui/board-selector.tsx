import * as React from "react";
import cx from "clsx";
import { presets } from "./app";
import type { BoardConfig, PresetValue, Preset } from "../types";
import { scope } from "../lib/utils";
import {
	WindowsWindow,
	WindowsWindowBody,
	WindowsWindowHeader,
	WindowsCloseButton,
} from "./windows-ui";
import { Radio, RadioGroup, RadioInput, RadioLabel } from "./radio";

const BoardSelector: React.FC<BoardSelectorProps> = ({
	className,
	board,
	onPresetSelect: onBoardSelect,
}) => {
	return (
		<WindowsWindow className={cx(scope("board-selector"), className)}>
			<fieldset className={scope("board-selector__fieldset")}>
				<WindowsWindowHeader className={scope("board-selector__header")}>
					<legend className={scope("board-selector__legend")}>Presets</legend>
					<WindowsCloseButton
						role="none"
						tabIndex={-1}
						style={{ pointerEvents: "none" }}
					/>
				</WindowsWindowHeader>

				<WindowsWindowBody style={{}}>
					<RadioGroup
						name="preset"
						checked={(board as PresetValue).name}
						onChange={(value) => {
							onBoardSelect(presets[value as Preset]);
						}}
					>
						{Object.keys(presets).map((key) => {
							return (
								<div key={key}>
									<Radio id={`preset-option-${key}`} value={key}>
										<RadioInput />
										<RadioLabel>{key}</RadioLabel>
									</Radio>
								</div>
							);
						})}
					</RadioGroup>
				</WindowsWindowBody>
			</fieldset>
		</WindowsWindow>
	);
};

interface BoardSelectorProps {
	className?: string;
	board: PresetValue | BoardConfig;
	onPresetSelect(board: PresetValue): void;
}

export type { BoardSelectorProps };
export { BoardSelector };
