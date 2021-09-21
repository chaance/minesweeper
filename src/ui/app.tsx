import * as React from "react";
import { Board } from "./board";
import { BoardSelector } from "./board-selector";
import { scope } from "../lib/utils";
import type { Presets } from "../types";

export const presets: Presets = {
	Baby: {
		name: "Baby",
		rows: 4,
		columns: 4,
		mines: 3,
	},
	Beginner: {
		name: "Beginner",
		rows: 9,
		columns: 9,
		mines: 10,
	},
	Intermediate: {
		name: "Intermediate",
		rows: 16,
		columns: 16,
		mines: 40,
	},
	Expert: {
		name: "Expert",
		rows: 16,
		columns: 30,
		mines: 99,
	},
};

function App() {
	let [board, setBoard] = React.useState(presets.Beginner);
	return (
		<div className={scope("app")}>
			<BoardSelector
				board={board}
				onPresetSelect={setBoard}
				className={scope("app__board-selector")}
			/>
			<Board board={board} />
		</div>
	);
}

export default App;
