package net.sourceforge.swaplist;

import java.io.Serializable;
import java.util.Iterator;

public class SwapListIterator<E extends Serializable> implements Iterator<E> {

    private final SwapList<E> list;
    private int idx;

    public SwapListIterator(SwapList<E> swapList) {
        this.list = swapList;
        this.idx = 0;
    }

    @Override
    public boolean hasNext() {
        return this.idx < list.size();
    }

    @Override
    public E next() {
        E obj = list.get(idx);
        idx++;
        return obj;
    }

    @Override
    public void remove() {
        throw new UnsupportedOperationException("remove() is not implemented");
    }
}
