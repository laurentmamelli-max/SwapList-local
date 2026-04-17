package net.sourceforge.swaplist;

public class SwapListException extends RuntimeException {

    private static final long serialVersionUID = -6066072169776489107L;

    public SwapListException(String message) {
        super(message);
    }

    public SwapListException(String message, Exception cause) {
        super(message, cause);
    }
}
