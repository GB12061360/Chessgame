package com.crimsonknights.chess;

/**
 * Additional metadata attached to a move.
 */
public final class MoveFlags {
    private boolean capture;
    private boolean enPassant;
    private boolean promotion;
    private boolean doublePush;
    private CastlingSide castle;

    public enum CastlingSide {
        KING_SIDE,
        QUEEN_SIDE
    }

    public boolean isCapture() {
        return capture;
    }

    public void setCapture(boolean capture) {
        this.capture = capture;
    }

    public boolean isEnPassant() {
        return enPassant;
    }

    public void setEnPassant(boolean enPassant) {
        this.enPassant = enPassant;
    }

    public boolean isPromotion() {
        return promotion;
    }

    public void setPromotion(boolean promotion) {
        this.promotion = promotion;
    }

    public boolean isDoublePush() {
        return doublePush;
    }

    public void setDoublePush(boolean doublePush) {
        this.doublePush = doublePush;
    }

    public CastlingSide getCastle() {
        return castle;
    }

    public void setCastle(CastlingSide castle) {
        this.castle = castle;
    }

    public MoveFlags copy() {
        MoveFlags copy = new MoveFlags();
        copy.capture = capture;
        copy.enPassant = enPassant;
        copy.promotion = promotion;
        copy.doublePush = doublePush;
        copy.castle = castle;
        return copy;
    }
}
