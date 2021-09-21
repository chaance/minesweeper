import type { BoardConfig, CellStatus } from "../types";

interface CellData {
	index: number;
	board: BoardConfig;
	mines: number[];
	status?: CellStatus;
}

export class Cell {
	index: number;
	status: CellStatus;
	row: number;
	column: number;

	private __board: BoardConfig;
	private __mines: number[];

	constructor(cell: Cell);
	constructor(cell: Cell, data: Partial<CellData>);
	constructor(data: CellData);

	constructor(cell: CellData | Cell, data?: Partial<CellData>) {
		let cellData: CellData;
		if (cell instanceof Cell) {
			cellData = {
				index: cell.index,
				board: cell.__board,
				mines: cell.__mines,
				status: cell.status,
				...data,
			};
		} else {
			cellData = cell;
		}

		this.__board = cellData.board;
		this.__mines = cellData.mines;
		this.status = cellData.status || "hidden";
		this.index = cellData.index;
		this.column = getCellColumn(this.index, this.__board);
		this.row = getCellRow(this.index, this.__board);
	}

	hasMine(): boolean {
		return this.__mines ? this.__mines.includes(this.index) : false;
	}

	get adjacentIndexMatrix(): (number | null)[] {
		let board = this.__board;
		let row = this.row;
		let column = this.column;
		// prettier-ignore
		return [

			/*      left                     center               right */
			/* 1 */ [ row - 1, column - 1 ], [ row - 1, column ], [ row - 1, column + 1 ],

			/* 2 */ [ row,     column - 1 ],      /*  💣  */      [ row,     column + 1 ],

			/* 3 */ [ row + 1, column - 1 ], [ row + 1, column ], [ row + 1, column + 1 ],

		].map(([row, column]) => {
			return getIndexByRowAndColumn({ row, column, board })
		})
	}

	get adjacentMineCount(): number {
		return this.hasMine()
			? -1
			: this.adjacentIndexMatrix.reduce<number>((count, index) => {
					return this.__mines && index != null
						? this.__mines.includes(index)
							? ++count
							: count
						: count;
			  }, 0);
	}
}

function getCellRow(index: number, board: BoardConfig): number {
	return Math.floor(index / board.columns);
}

function getCellColumn(index: number, board: BoardConfig): number {
	return index % board.columns;
}

function getIndexByRowAndColumn({
	board,
	row,
	column,
}: {
	board: BoardConfig;
	row: number;
	column: number;
}): number | null {
	if (
		row < 0 ||
		column < 0 ||
		row > board.rows - 1 ||
		column > board.columns - 1
	) {
		return null;
	}
	return row * board.columns + column;
}
