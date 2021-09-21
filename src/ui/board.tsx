import * as React from "react";
import { Button } from "./button";
import cx from "clsx";
import type { BoardConfig, GameState, CellStatus } from "../types";
import { Cell } from "./cell";
import { presets } from "./app";
import { scope } from "../lib/utils";
import { WindowsWindow, WindowsBox, WindowsWindowHeader } from "./windows-ui";
import { CountDisplay } from "./count-display";

// TODO: Screen reader testing
// TODO: Browser testing
// TODO: Keyboard grid navigation
// TODO: Optimize algorithms, some of these functions are a bit smelly still!
// TODO: Fix loading jank

const initialContext: BoardContext = {
	gameState: "idle",
	cells: [],
	mines: [],
	initialized: false,
};

type BoardEvent =
	| { type: "RESET"; board: BoardConfig }
	| { type: "REVEAL_CELL"; index: number; board: BoardConfig }
	| { type: "REVEAL_ADJACENT_CELLS"; index: number; board: BoardConfig }
	| { type: "MARK_CELL"; index: number; board: BoardConfig }
	| { type: "MARK_REMAINING_MINES"; board: BoardConfig };

function reducer(context: BoardContext, event: BoardEvent): BoardContext {
	if (event.type === "RESET") {
		return {
			...context,
			gameState: "idle",
			cells: resetCells(event.board),
			initialized: false,
		};
	}

	switch (context.gameState) {
		case "idle": {
			switch (event.type) {
				case "REVEAL_CELL": {
					let mines = initMines({
						totalMines: event.board.mines,
						initialCellIndex: event.index,
						maxMines: getMaxMines(context.cells),
					});

					let [gameState, cells] = selectCell(
						event.index,
						initCells(event.board, mines),
						mines,
						event.board,
						context.gameState
					);

					return {
						...context,
						gameState,
						cells,
						mines,
						initialized: true,
					};
				}
				case "MARK_CELL": {
					let cells = [...context.cells];
					let cell = cells[event.index];

					if (!cell) {
						throw new Error(
							"Invalid index when marking the cell. Something weird happened!"
						);
					}

					cells[event.index] = toggleCellFlags(cell);

					return {
						...context,
						gameState: "active",
						cells,
					};
				}
			}
		}
		case "active": {
			switch (event.type) {
				case "REVEAL_CELL": {
					let mines = context.mines;
					let cells = context.cells;
					let gameState: GameState = context.gameState;

					// The user can begin the game befopre initializing the board. For
					// example, they may start by first flagging a cell, which will start
					// the timer and enter into an active state. This doesn't really make
					// sense as a strategic move, but in that case we'll check to see that
					// we actually have a board and mines initialized before revealing the
					// cell (because all cells are still empty at this point)
					if (!context.initialized) {
						mines = initMines({
							totalMines: event.board.mines,
							initialCellIndex: event.index,
							maxMines: getMaxMines(context.cells),
						});
						cells = addMinesToCells(cells, event.board, mines);
					}

					[gameState, cells] = selectCell(
						event.index,
						cells,
						mines,
						event.board,
						gameState
					);
					return {
						...context,
						gameState,
						cells,
						mines,
						initialized: true,
					};
				}
				case "REVEAL_ADJACENT_CELLS": {
					let cells = [...context.cells];
					let cell = cells[event.index];
					if (cell.adjacentMineCount <= 0) {
						return context;
					}

					let markCount = 0;
					let cellsToReveal: number[] = [];
					let board = event.board;
					let mines = context.mines;
					let gameState: GameState = context.gameState;

					for (let idx of cell.adjacentIndexMatrix) {
						if (idx == null) continue;
						let cell = cells[idx];
						if (cell.status === "flagged") {
							markCount++;
						}
						if (cell && cell.status === "hidden") {
							cellsToReveal.push(idx);
						}
					}
					if (markCount >= cell.adjacentMineCount) {
						for (let cell of cellsToReveal) {
							[gameState, cells] = selectCell(
								cell,
								cells,
								mines,
								board,
								gameState
							);
						}
						return {
							...context,
							gameState,
							cells,
						};
					}
					return context;
				}
				case "MARK_CELL": {
					let cells = [...context.cells];
					let cell = cells[event.index];

					if (!cell) {
						throw new Error(
							"Invalid index when marking the cell. Something weird happened!"
						);
					}

					cells[event.index] = toggleCellFlags(cell);

					return {
						...context,
						cells,
					};
				}
			}
		}
		case "won": {
			switch (event.type) {
				case "MARK_REMAINING_MINES": {
					let cellsToMark = context.cells.reduce<number[]>(
						(cells, cell, index) => {
							if (cell.status === "hidden" || cell.status === "question") {
								return [...cells, index];
							}
							return cells;
						},
						[]
					);

					if (cellsToMark.length < 1) {
						return context;
					}

					let cells = [...context.cells];
					for (let index of cellsToMark) {
						let cell = cells[index];
						if (!cell) {
							throw new Error(
								"Invalid index when marking the cell. Something weird happened!"
							);
						}
						cells[index] = flagCell(cell);
					}
					return {
						...context,
						cells,
					};
				}
			}
		}
	}
	return context;
}

const Board: React.FC<BoardProps> = ({ board = presets.Beginner }) => {
	let [{ gameState, cells, mines }, send] = React.useReducer(
		reducer,
		initialContext,
		function getInitialContext(ctx) {
			return {
				...ctx,
				cells: createCells(board),
			};
		}
	);

	let [timeElapsed, resetTimer] = useTimer(gameState);

	React.useEffect(() => {
		if (gameState === "won") {
			send({
				type: "MARK_REMAINING_MINES",
				board: board,
			});
		}
	}, [gameState, board]);

	let reset = React.useCallback(() => {
		resetTimer();
		send({ type: "RESET", board });
	}, [board, resetTimer]);

	let firstRenderRef = React.useRef(true);
	React.useEffect(() => {
		if (firstRenderRef.current) {
			firstRenderRef.current = false;
		} else {
			reset();
		}
	}, [board, reset]);

	let remainingMineCount = getRemainingMineCount(cells, board.mines);

	return (
		<div className={scope("board")}>
			<WindowsWindow>
				<WindowsWindowHeader>Minesweeper</WindowsWindowHeader>
				<div className={scope("board__menu")} aria-hidden>
					<span>Game</span>
					<span>Help</span>
				</div>
				<WindowsBox className={scope("board__grid-wrapper")} depth={4}>
					<WindowsBox
						inset
						depth={3}
						className={scope("board__header-wrapper")}
					>
						<div className={scope("board__header")}>
							<WindowsBox inset>
								<CountDisplay
									className={scope("board__counter")}
									count={remainingMineCount}
								/>
							</WindowsBox>
							<ResetButton handleReset={reset} gameState={gameState} />
							<WindowsBox inset>
								<CountDisplay
									className={scope("board__counter")}
									count={timeElapsed}
								/>
							</WindowsBox>
						</div>
					</WindowsBox>
					<WindowsBox
						inset
						depth={4}
						style={{
							// @ts-ignore
							"--columns": board.columns,
							// @ts-ignore
							"--rows": board.rows,
						}}
						className={scope("board__grid")}
						role="grid"
						aria-label="Game board"
					>
						{Array(board.rows)
							.fill(null)
							.map((_, rowIndex) => {
								return (
									<div
										className={scope("board__row")}
										role="row"
										key={rowIndex}
									>
										{cells
											.slice(
												board.columns * rowIndex,
												board.columns * rowIndex + board.columns
											)
											.map((cell, i) => {
												let hasMine = mines.includes(cell.index);
												return (
													<GridCell
														key={i}
														status={cell.status}
														gameState={gameState}
														handleMark={() => {
															send({
																type: "MARK_CELL",
																index: cell.index,
																board: board,
															});
														}}
														handleSingleCellSelect={() => {
															send({
																type: "REVEAL_CELL",
																index: cell.index,
																board: board,
															});
														}}
														handleAdjacentCellsSelect={() => {
															send({
																type: "REVEAL_ADJACENT_CELLS",
																index: cell.index,
																board: board,
															});
														}}
													>
														<GridCellIcon
															status={cell.status}
															mineValue={cell.adjacentMineCount}
															hasMine={hasMine}
														/>
													</GridCell>
												);
											})}
									</div>
								);
							})}
					</WindowsBox>
				</WindowsBox>
			</WindowsWindow>
		</div>
	);
};

const GridCell: React.FC<GridCellProps> = ({
	children,
	gameState,
	handleMark,
	handleSingleCellSelect,
	handleAdjacentCellsSelect,
	status,
}) => {
	let gameIsOver = gameState === "won" || gameState === "lost";
	let isRevealed = status === "exploded" || status === "revealed";
	let ref = React.useRef<HTMLButtonElement>(null);

	return (
		<div
			role="gridcell"
			data-revealed={isRevealed ? "" : undefined}
			className={scope("board__cell")}
		>
			<Button
				ref={ref}
				data-status={status}
				data-revealed={isRevealed ? "" : undefined}
				// TODO: Not sure about this
				aria-disabled={gameIsOver}
				// TODO: Unsure about this since buttons can't be un-pressed. SR testing
				// needed.
				aria-pressed={isRevealed}
				aria-label={
					// TODO: Test w/ announcements
					status === "flagged"
						? "Flagged"
						: status === "question"
						? "Maybe"
						: status === "hidden"
						? "Hidden"
						: status === "exploded"
						? "Exploded!"
						: !children
						? "Blank"
						: undefined
				}
				onContextMenu={(event) => {
					if (!gameIsOver) {
						event.preventDefault();
					}
				}}
				onPointerDown={(event) => {
					if (gameIsOver) {
						return;
					}

					switch (status) {
						case "revealed":
							if (event.button === 2 || event.metaKey) {
								event.preventDefault();
								handleAdjacentCellsSelect();
							}
							break;
						case "hidden":
						case "flagged":
						case "question":
							if (event.button === 2 || event.metaKey) {
								event.preventDefault();
								handleMark();
							}
							break;
					}
				}}
				onMouseDown={(event) => {
					if (event.button === 2 || event.metaKey) {
						event.preventDefault();
						return;
					}
				}}
				onClick={(event) => {
					if (event.button === 2 || event.metaKey) {
						event.preventDefault();
						return;
					}
					if (!gameIsOver) {
						handleSingleCellSelect();
					}
				}}
				className={cx(scope("board__cell-button"))}
			>
				{children}
			</Button>
		</div>
	);
};
GridCell.displayName = "GridCell";

const GridCellIcon: React.VFC<GridCellIconProps> = ({
	status,
	hasMine,
	mineValue,
}) => {
	let value: string = "";
	switch (status) {
		case "exploded":
			value = "💥";
			break;
		case "flagged":
			value = "🚩";
			break;
		case "question":
			value = "❓";
			break;
		case "revealed":
			value = hasMine ? "💣" : mineValue ? String(mineValue) : "";
			break;
	}
	return (
		<span
			style={
				status === "revealed" && mineValue
					? {
							color: `var(--color-tile-0${mineValue})`,
							fontFamily: `var(--font-tile-numbers)`,
					  }
					: undefined
			}
		>
			{value}
		</span>
	);
};

const ResetButton: React.VFC<ResetButtonProps> = ({
	handleReset,
	gameState,
}) => {
	return (
		<Button
			className={scope("board__reset-button")}
			onClick={handleReset}
			aria-label="Reset game"
		>
			{(() => {
				switch (gameState) {
					case "won":
						return "😎";
					case "lost":
						return "😵";
					default:
						return "🙂";
				}
			})()}
		</Button>
	);
};

function initMines({
	totalMines,
	maxMines,
	initialCellIndex,
}: {
	totalMines: number;
	maxMines: number;
	initialCellIndex: number;
}) {
	let mines: number[] = [];
	let minesToAssign = Array(totalMines).fill(null);
	let randomCellIndex: number;
	do {
		randomCellIndex = Math.floor(Math.random() * maxMines);
		if (
			mines.indexOf(randomCellIndex) === -1 &&
			initialCellIndex !== randomCellIndex
		) {
			minesToAssign.pop();
			mines.push(randomCellIndex);
		}
	} while (minesToAssign.length);
	return mines;
}

function getRemainingMineCount(cells: Cells, totalMines: number): number {
	return (
		totalMines -
		cells.reduce((prev, cur) => {
			return cur.status === "flagged" ? ++prev : prev;
		}, 0)
	);
}

function getCellCount(board: BoardConfig): number {
	return board.columns * board.rows;
}

function createCells(board: BoardConfig, mines?: number[]): Cells {
	return Array(getCellCount(board))
		.fill(null)
		.map((_, index) => {
			return new Cell({
				index,
				board,
				mines: mines || [],
				status: "hidden",
			});
		});
}

function resetCells(board: BoardConfig): Cells {
	return createCells(board);
}

function initCells(board: BoardConfig, mines: number[]): Cells {
	return createCells(board, mines);
}

function addMinesToCells(
	cells: Cells,
	board: BoardConfig,
	mines: number[]
): Cells {
	return Array(getCellCount(board))
		.fill(null)
		.map((_, index) => {
			return new Cell({
				index,
				board,
				mines: mines,
				status: cells[index]?.status || "hidden",
			});
		});
}

function flagCell(cell: Cell): Cell {
	return new Cell(cell, {
		status: "flagged",
	});
}

function toggleCellFlags(cell: Cell): Cell {
	return new Cell(cell, {
		status:
			cell.status === "flagged"
				? "question"
				: cell.status === "question"
				? "hidden"
				: "flagged",
	});
}

// TODO: .................. 🤷‍♂️
function selectCell(
	cellIndex: number,
	cells: Cells,
	mines: number[],
	board: BoardConfig,
	startingState: GameState
): [GameState, Cells] {
	let cellsCopy = [...cells];
	let cell = cellsCopy[cellIndex];
	if (!cell) {
		throw new Error(
			"Invalid index when selecting the cell. Something weird happened!"
		);
	}
	if (cell.status === "exploded" || cell.status === "revealed") {
		return [startingState, cells];
	}

	// This cell is a mine so BOOOOOOOOM
	if (mines.includes(cellIndex)) {
		// reveal all mines, then return new context because the game is over!
		for (let index of mines) {
			cellsCopy[index] = new Cell(cell, {
				status: index === cellIndex ? "exploded" : "revealed",
			});
		}
		return ["lost", cellsCopy];
	}

	cellsCopy[cellIndex] = new Cell(cell, {
		status: "revealed",
	});

	let isComplete =
		cellsCopy.length - mines.length === getTotalRevealedCells(cellsCopy);

	let gameState: GameState;
	// eslint-disable-next-line no-self-assign
	[gameState, cellsCopy] = [isComplete ? "won" : "active", cellsCopy];

	if (cell.adjacentMineCount === 0) {
		let adjacentCells = cell.adjacentIndexMatrix.filter(
			(idx) => idx != null
		) as number[];

		for (let adjacentCellIndex of adjacentCells) {
			let adjacentCell = cellsCopy[adjacentCellIndex];
			if (adjacentCell.adjacentMineCount >= 0) {
				[gameState, cellsCopy] = selectCell(
					adjacentCellIndex,
					cellsCopy,
					mines,
					board,
					gameState
				);
			}
		}
	}

	return [gameState, cellsCopy];
}

function getMaxMines(cells: Cells): number {
	return cells.length - 1;
}

function getTotalRevealedCells(cells: Cells) {
	return cells.reduce((count, cell) => {
		if (cell.status === "revealed") {
			return ++count;
		}
		return count;
	}, 0);
}

function useTimer(gameState: GameState): [number, () => void] {
	let [timeElapsed, setTimeElapsed] = React.useState(0);
	React.useEffect(() => {
		if (gameState === "active") {
			let id = window.setInterval(() => {
				setTimeElapsed((t) => (t <= 999 ? ++t : t));
			}, 1000);
			return () => {
				window.clearInterval(id);
			};
		}
	}, [gameState]);
	const reset = React.useCallback(() => {
		setTimeElapsed(0);
	}, []);
	return [timeElapsed, reset];
}

interface GridCellIconProps {
	status: CellStatus;
	mineValue?: number;
	hasMine: boolean;
}

interface BoardProps {
	board?: BoardConfig;
}

type Cells = Cell[];

interface BoardContext {
	gameState: GameState;
	cells: Cells;
	mines: number[];
	initialized: boolean;
}

interface GridCellProps {
	gameState: GameState;
	handleMark(): void;
	handleSingleCellSelect(): void;
	handleAdjacentCellsSelect(): void;
	status: CellStatus;
	children: React.ReactNode;
}

interface ResetButtonProps {
	handleReset(): void;
	gameState: GameState;
}

export type { BoardProps };
export { Board };
