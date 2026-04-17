import java.io.File;

import net.sourceforge.swaplist.SwapList;

public final class SwapListOfficialJarDemo {

    private SwapListOfficialJarDemo() {
    }

    public static void main(String[] args) {
        SwapList list = new SwapList(500);

        for (int i = 0; i < 5000; i++) {
            list.add("Data item #" + i);
        }

        System.out.println("Size: " + list.size());
        System.out.println("Current page index: " + list.getCurrentPageIndex());
        System.out.println("Saved pages on disk: " + (list.getSavedPageIndex() + 1));
        System.out.println("First item: " + list.get(0));
        System.out.println("Last item: " + list.get(4999));
        System.out.println("First swap file exists: " + new File(list.getSwapFileName(0)).exists());
    }
}
