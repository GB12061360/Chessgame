package com.crimsonknights.chess;

import java.util.Objects;

/**
 * Represents a legal move.
 */
public class Move {
    private final String from;
    private final String to;
    private final PieceType piece;
    private final PieceColor color;
    private final Piece captured;
    private final PieceType promotion;
    private final MoveFlags flags;
    private final String captureSquare;

    public Move(String from, String to, PieceType piece, PieceColor color,
                Piece captured, PieceType promotion, MoveFlags flags, String captureSquare) {
        this.from = Objects.requireNonNull(from, "from");
        this.to = Objects.requireNonNull(to, "to");
        this.piece = Objects.requireNonNull(piece, "piece");
        this.color = Objects.requireNonNull(color, "color");
        this.captured = captured;
        this.promotion = promotion;
        this.flags = flags != null ? flags : new MoveFlags();
        this.captureSquare = captureSquare;
    }

    public String getFrom() {
        return from;
    }

    public String getTo() {
        return to;
    }

    public PieceType getPiece() {
        return piece;
    }

    public PieceColor getColor() {
        return color;
    }

    public Piece getCaptured() {
        return captured;
    }

    public PieceType getPromotion() {
        return promotion;
    }

    public MoveFlags getFlags() {
        return flags;
    }

    public String getCaptureSquare() {
        return captureSquare;
    }

    public Move copy() {
        return new Move(from, to, piece, color, captured == null ? null : captured.copy(), promotion,
                flags == null ? null : flags.copy(), captureSquare);
    }
}
