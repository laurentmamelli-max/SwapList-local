package net.sourceforge.swaplist;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.AbstractList;
import java.util.ArrayList;
import java.util.Iterator;

public class SwapList<E extends Serializable> extends AbstractList<E> implements AutoCloseable {

    public static final int DEFAULT_MAX_PAGE_SIZE = 5000;
    public static final String TEMPORARY_FILE_PREFIX = "swaplist";
    public static final String TEMPORARY_FILE_SUFFIX = ".ser";

    private Path tempFile;
    private String tempFileGivenPrefix;
    private Path workPath;
    private int currentPageIndex;
    private int maxPageSize;
    private int size;
    private int pageCount;
    private int savedPageIndex;

    private ArrayList<E> page;
    private boolean dirty;
    private boolean closed;

    public SwapList() {
        init(DEFAULT_MAX_PAGE_SIZE, System.getProperty("java.io.tmpdir"));
    }

    public SwapList(int maxPageSize) {
        init(maxPageSize, System.getProperty("java.io.tmpdir"));
    }

    public SwapList(int maxPageSize, String workPath) {
        init(maxPageSize, workPath);
    }

    private void init(int maxPageSize, String workPath) {
        if (maxPageSize <= 0) {
            throw new SwapListException("SwapList invalid param. maxPageSize must be greater than 0.");
        }

        String effectiveWorkPath = workPath;
        if (effectiveWorkPath == null || effectiveWorkPath.isBlank()) {
            effectiveWorkPath = System.getProperty("java.io.tmpdir");
        }

        Path workPathDir = Paths.get(effectiveWorkPath);
        if (!Files.exists(workPathDir)) {
            throw new SwapListException("SwapList invalid param. workPath does not exist: " + effectiveWorkPath);
        }
        if (!Files.isDirectory(workPathDir)) {
            throw new SwapListException("SwapList invalid param. workPath is not a directory.");
        }

        try {
            this.tempFile = Files.createTempFile(workPathDir, TEMPORARY_FILE_PREFIX, TEMPORARY_FILE_SUFFIX);
        } catch (IOException e) {
            throw new SwapListException("SwapList error: There was an error trying to create a temporary file.", e);
        }

        String tempFileName = this.tempFile.getFileName().toString();
        int idx = tempFileName.indexOf(TEMPORARY_FILE_SUFFIX);
        if (idx < 0) {
            throw new SwapListException(
                "SwapList error: Expected to find file suffix "
                    + TEMPORARY_FILE_SUFFIX
                    + " in temporary file name: "
                    + tempFileName
            );
        }

        this.tempFileGivenPrefix = tempFileName.substring(0, idx);
        this.workPath = workPathDir;
        this.currentPageIndex = -1;
        this.page = null;
        this.pageCount = 0;
        this.savedPageIndex = -1;
        this.maxPageSize = maxPageSize;
        this.size = 0;
        this.dirty = false;
        this.closed = false;
    }

    public String getSwapFileName(int idx) {
        return this.workPath.resolve(this.tempFileGivenPrefix + "_" + idx + TEMPORARY_FILE_SUFFIX).toString();
    }

    private void ensureOpen() {
        if (this.closed) {
            throw new SwapListException("SwapList is already closed.");
        }
    }

    private int computePageIndexFromRowIndex(int itemIndex) {
        return itemIndex / this.maxPageSize;
    }

    private void checkCurrentPage(int pageIndex) throws IOException, ClassNotFoundException {
        if (pageIndex != this.currentPageIndex) {
            swapPage(pageIndex);
        }
    }

    private void swapPage(int pageIndex) throws IOException, ClassNotFoundException {
        saveCurrentPage();
        if ((pageIndex + 1) > this.pageCount) {
            newPage();
        } else {
            loadPage(pageIndex);
        }
    }

    private void newPage() {
        this.page = new ArrayList<>();
        this.currentPageIndex = this.pageCount;
        this.pageCount++;
        this.dirty = false;
    }

    @SuppressWarnings("unchecked")
    private void loadPage(int pageIndex) throws IOException, ClassNotFoundException {
        try (ObjectInputStream in = new ObjectInputStream(
            new BufferedInputStream(new FileInputStream(getSwapFileName(pageIndex)))
        )) {
            this.page = (ArrayList<E>) in.readObject();
            this.currentPageIndex = pageIndex;
            this.dirty = false;
        }
    }

    private void saveCurrentPage() throws IOException {
        if (this.currentPageIndex > -1 && this.dirty) {
            try (ObjectOutputStream out = new ObjectOutputStream(
                new BufferedOutputStream(new FileOutputStream(getSwapFileName(this.currentPageIndex)))
            )) {
                out.writeObject(this.page);
                out.flush();
            }

            if (this.currentPageIndex > this.savedPageIndex) {
                this.savedPageIndex = this.currentPageIndex;
            }
            this.dirty = false;
        }
    }

    @Override
    public boolean add(E obj) {
        ensureOpen();
        try {
            int pageIndex = computePageIndexFromRowIndex(this.size);
            checkCurrentPage(pageIndex);
            this.page.add(obj);
            this.size++;
            this.dirty = true;
            return true;
        } catch (IOException | ClassNotFoundException e) {
            throw new SwapListException("Unable to add an item to SwapList.", e instanceof Exception ? (Exception) e : new Exception(e));
        }
    }

    @Override
    public E get(int index) {
        ensureOpen();
        if (index < 0 || index >= this.size) {
            throw new IndexOutOfBoundsException("Index: " + index + ", Size: " + this.size);
        }

        try {
            int pageIndex = computePageIndexFromRowIndex(index);
            checkCurrentPage(pageIndex);
            int pageOffset = index - this.maxPageSize * pageIndex;
            return this.page.get(pageOffset);
        } catch (IOException | ClassNotFoundException e) {
            throw new SwapListException("Unable to read an item from SwapList.", e instanceof Exception ? (Exception) e : new Exception(e));
        }
    }

    @Override
    public Iterator<E> iterator() {
        ensureOpen();
        return new SwapListIterator<>(this);
    }

    @Override
    public int size() {
        return this.size;
    }

    @Override
    public boolean isEmpty() {
        return this.size <= 0;
    }

    @Override
    public void clear() {
        ensureOpen();
        deleteAllTemporaryFiles();
        init(this.maxPageSize, this.workPath.toString());
    }

    @Override
    public void close() {
        if (this.closed) {
            return;
        }

        deleteAllTemporaryFiles();
        this.page = null;
        this.closed = true;
    }

    private void deleteAllTemporaryFiles() {
        for (int i = 0; i <= this.savedPageIndex; i++) {
            deleteQuietly(Paths.get(getSwapFileName(i)));
        }
        if (this.tempFile != null) {
            deleteQuietly(this.tempFile);
        }
    }

    private void deleteQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            System.err.println("WARNING: Temporary file was not deleted: " + path);
        }
    }

    public String getTempFileGivenPrefix() {
        return tempFileGivenPrefix;
    }

    public int getCurrentPageIndex() {
        return currentPageIndex;
    }

    public int getPageCount() {
        return pageCount;
    }

    public int getMaxPageSize() {
        return maxPageSize;
    }

    public int getSavedPageIndex() {
        return savedPageIndex;
    }
}
