package com.crimsonknights.chess;

/**
 * Enumerates the chess piece types.
 */
public enum PieceType {
    KING('k'),
    QUEEN('q'),
    ROOK('r'),
    BISHOP('b'),
    KNIGHT('n'),
    PAWN('p');

    private final char fenChar;

    PieceType(char fenChar) {
        this.fenChar = fenChar;
    }

    public char getFenChar() {
        return fenChar;
    }

    public static PieceType fromFenChar(char fenChar) {
        switch (Character.toLowerCase(fenChar)) {
            case 'k':
                return KING;
            case 'q':
                return QUEEN;
            case 'r':
                return ROOK;
            case 'b':
                return BISHOP;
            case 'n':
                return KNIGHT;
            case 'p':
                return PAWN;
            default:
                throw new IllegalArgumentException("Unknown FEN piece: " + fenChar);
        }
    }
}
