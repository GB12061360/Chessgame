package com.crimsonknights.chess;

/**
 * Represents the color of a chess piece.
 */
public enum PieceColor {
    WHITE('w'),
    BLACK('b');

    private final char fenChar;

    PieceColor(char fenChar) {
        this.fenChar = fenChar;
    }

    public char getFenChar() {
        return fenChar;
    }

    public static PieceColor fromFenChar(char fenChar) {
        return fenChar == 'w' ? WHITE : BLACK;
    }

    public PieceColor opposite() {
        return this == WHITE ? BLACK : WHITE;
    }
}
