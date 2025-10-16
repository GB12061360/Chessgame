package com.crimsonknights.chess;

/**
 * Tracks castling eligibility for a side.
 */
public final class CastlingRights {
    private boolean kingSide;
    private boolean queenSide;

    public CastlingRights(boolean kingSide, boolean queenSide) {
        this.kingSide = kingSide;
        this.queenSide = queenSide;
    }

    public boolean canCastleKingSide() {
        return kingSide;
    }

    public boolean canCastleQueenSide() {
        return queenSide;
    }

    public void setKingSide(boolean kingSide) {
        this.kingSide = kingSide;
    }

    public void setQueenSide(boolean queenSide) {
        this.queenSide = queenSide;
    }

    public CastlingRights copy() {
        return new CastlingRights(kingSide, queenSide);
    }
}
