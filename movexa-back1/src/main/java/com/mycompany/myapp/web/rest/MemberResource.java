package com.mycompany.myapp.web.rest;

import com.mycompany.myapp.service.MemberImportService;
import com.mycompany.myapp.service.MemberService;
import com.mycompany.myapp.service.dto.MemberDTO;
import com.mycompany.myapp.service.dto.MemberDtos.ImportRequest;
import com.mycompany.myapp.service.dto.MemberDtos.ImportResult;
import com.mycompany.myapp.service.dto.MemberDtos.MemberLiteDTO;
import com.mycompany.myapp.service.dto.MemberDtos.MemberOverviewDTO;
import com.mycompany.myapp.web.rest.errors.BadRequestAlertException;
import com.mycompany.myapp.web.rest.errors.NotFoundException;
import jakarta.validation.Valid;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tech.jhipster.web.util.HeaderUtil;
import tech.jhipster.web.util.PaginationUtil;
import tech.jhipster.web.util.ResponseUtil;

/**
 * API des membres. Via le gateway : /services/movexa-back1/api/members
 */
@RestController
@RequestMapping("/api/members")
public class MemberResource {

    private static final Logger LOG = LoggerFactory.getLogger(MemberResource.class);
    private static final String ENTITY_NAME = "member";

    @Value("${spring.application.name}")
    private String applicationName;

    private final MemberService memberService;
    private final MemberImportService importService;

    public MemberResource(MemberService memberService, MemberImportService importService) {
        this.memberService = memberService;
        this.importService = importService;
    }

    /**
     * GET /api/members?page=0&size=20&sort=id,asc
     * Le nombre total d'éléments est renvoyé dans l'en-tête X-Total-Count.
     */
    @GetMapping("")
    public ResponseEntity<List<MemberDTO>> getAllMembers(
        @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        LOG.debug("REST : liste des membres, {}", pageable);
        Page<MemberDTO> page = memberService.findAll(pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /** GET /api/members/search?q=awa : recherche instantanée (nom, numéro, téléphone). */
    @GetMapping("/search")
    public List<MemberLiteDTO> search(@RequestParam("q") String q, @RequestParam(defaultValue = "8") int limit) {
        return memberService.search(q, limit);
    }

    /** GET /api/members/lite : tous les membres en version légère (cache du pointage hors ligne). */
    @GetMapping("/lite")
    public List<MemberLiteDTO> lite() {
        return memberService.findAllLite();
    }

    /** GET /api/members/by-qr/{token} : membre correspondant à un QR code scanné. */
    @GetMapping("/by-qr/{token}")
    public MemberLiteDTO byQr(@PathVariable String token) {
        return memberService.findByQr(token).orElseThrow(() -> new NotFoundException("QR code inconnu"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MemberDTO> getMember(@PathVariable Long id) {
        return ResponseUtil.wrapOrNotFound(memberService.findOne(id));
    }

    /** GET /api/members/{id}/overview : tout le contenu de la fiche membre. */
    @GetMapping("/{id}/overview")
    public ResponseEntity<MemberOverviewDTO> overview(@PathVariable Long id) {
        return ResponseUtil.wrapOrNotFound(memberService.overview(id));
    }

    @PostMapping("")
    public ResponseEntity<MemberDTO> createMember(@Valid @RequestBody MemberDTO dto) throws URISyntaxException {
        if (dto.getId() != null) {
            throw new BadRequestAlertException("Un nouveau membre ne peut pas déjà avoir un id", ENTITY_NAME, "idexists");
        }
        MemberDTO result = memberService.create(dto);
        return ResponseEntity.created(new URI("/api/members/" + result.getId()))
            .headers(HeaderUtil.createEntityCreationAlert(applicationName, false, ENTITY_NAME, result.getId().toString()))
            .body(result);
    }

    /** POST /api/members/import : vérifie (dryRun = true) ou importe une liste lue dans un fichier CSV. */
    @PostMapping("/import")
    public ImportResult importMembers(@Valid @RequestBody ImportRequest request) {
        return importService.importMembers(request);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MemberDTO> updateMember(@PathVariable Long id, @Valid @RequestBody MemberDTO dto) {
        if (dto.getId() != null && !dto.getId().equals(id)) {
            throw new BadRequestAlertException("L'id du corps ne correspond pas à celui de l'URL", ENTITY_NAME, "idinvalid");
        }
        return ResponseUtil.wrapOrNotFound(
            memberService.update(id, dto),
            HeaderUtil.createEntityUpdateAlert(applicationName, false, ENTITY_NAME, id.toString())
        );
    }

    /** DELETE /api/members/{id} : archive le membre (son historique est conservé). */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMember(@PathVariable Long id) {
        if (!memberService.archive(id)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent()
            .headers(HeaderUtil.createEntityDeletionAlert(applicationName, false, ENTITY_NAME, id.toString()))
            .build();
    }
}
